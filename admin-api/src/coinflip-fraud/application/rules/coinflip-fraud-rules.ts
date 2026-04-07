import { CoinflipFraudReason } from '../../domain/coinflip-fraud.reasons';
import type { FraudRuleHit } from '../../domain/coinflip-fraud.risk.types';
import type {
  PairFraudSnapshot,
  UserFraudSnapshot,
} from '../../infrastructure/coinflip-fraud.redis-repository';
import {
  BET_SPIKE_MIN_HISTORY,
  BET_SPIKE_MULTIPLIER,
  BOT_JOIN_CV_MAX,
  BOT_JOIN_MEAN_MS_MAX,
  BOT_TIMING_MIN_SAMPLES,
  COLLUSION_PAIR_MIN_GAMES,
  COLLUSION_REPEAT_PAIR_GAMES,
  COLLUSION_WIN_SHARE_IMBALANCE,
  EV_WIN_SHARE_RATIO_FLAG,
  EV_ZSCORE_FLAG,
  MIN_GAMES_EV,
  MIN_GAMES_WIN_RATE,
  MONEY_FLOW_MIN_CENTS,
  MONEY_FLOW_SKEW_RATIO,
  SHARED_FP_USER_THRESHOLD,
  SHARED_IP_USER_THRESHOLD,
  WIN_RATE_SUSPICIOUS_LOWER_BOUND,
} from '../../domain/coinflip-fraud.thresholds';
import { meanAndCv, median, wilsonLowerBound } from '../math/wilson-score';

/** Portion of rule weight applied to the fast-decaying score component (rest → persistent). */
const TEMP_SHARE = {
  high: 0.72,
  mid: 0.45,
  low: 0.22,
} as const;

export function ruleWinRate(snapshot: UserFraudSnapshot): FraudRuleHit | null {
  const g = snapshot.stats.games;
  if (g < MIN_GAMES_WIN_RATE) return null;
  const w = snapshot.stats.wins;
  const low = wilsonLowerBound(w, g);
  if (low <= WIN_RATE_SUSPICIOUS_LOWER_BOUND) return null;
  const mag = Math.min(28, 12 + (low - WIN_RATE_SUSPICIOUS_LOWER_BOUND) * 120);
  return {
    reason: CoinflipFraudReason.WIN_RATE_HIGH_CONFIDENCE,
    family: 'statistical',
    weight: mag,
    detail: `Wilson lower bound win rate ${(low * 100).toFixed(1)}% over n=${g}`,
    tempShare: TEMP_SHARE.low,
  };
}

export function ruleEvDeviation(snapshot: UserFraudSnapshot): FraudRuleHit | null {
  const g = snapshot.stats.games;
  if (g < MIN_GAMES_EV) return null;
  const expNet = snapshot.stats.expectedNetCents / 100;
  const actNet = snapshot.stats.actualNetCents / 100;
  /** Variance proxy: sum stake^2 * 0.25 roughly for per-game P&L under fair coin. */
  const varProxy = Math.max(1, snapshot.stats.wageredCents ** 2 * 0.000002);
  const z = (actNet - expNet) / Math.sqrt(varProxy);
  const ratio =
    snapshot.stats.expWinShareCents > 0
      ? snapshot.stats.payoutCents / snapshot.stats.expWinShareCents
      : 0;

  const zHit = z >= EV_ZSCORE_FLAG;
  const ratioHit = ratio >= EV_WIN_SHARE_RATIO_FLAG && g >= MIN_GAMES_EV + 5;

  if (!zHit && !ratioHit) return null;

  const w = Math.min(
    30,
    (zHit ? 10 + Math.min(z - EV_ZSCORE_FLAG, 3) * 6 : 0) +
      (ratioHit ? 6 + (ratio - EV_WIN_SHARE_RATIO_FLAG) * 10 : 0),
  );

  return {
    reason: CoinflipFraudReason.EV_PROFIT_ANOMALY,
    family: 'statistical',
    weight: w,
    detail: `Net P&L z≈${z.toFixed(2)}, payout/expWinShare ratio≈${ratio.toFixed(2)} (n=${g})`,
    tempShare: TEMP_SHARE.low,
  };
}

export function ruleCollusionPair(
  userA: string,
  userB: string,
  pair: PairFraudSnapshot,
): FraudRuleHit[] {
  const hits: FraudRuleHit[] = [];
  if (pair.games < COLLUSION_PAIR_MIN_GAMES) return hits;

  if (pair.games >= COLLUSION_REPEAT_PAIR_GAMES) {
    hits.push({
      reason: CoinflipFraudReason.COLLUSION_REPEATED_PAIR,
      family: 'collusion',
      weight: Math.min(
        26,
        8 + (pair.games - COLLUSION_REPEAT_PAIR_GAMES) * 1.1,
      ),
      detail: `Pair ${userA}↔${userB} met ${pair.games} times`,
      tempShare: TEMP_SHARE.mid,
    });
  }

  const ws = pair.winsSmallerUser;
  const wl = pair.winsLargerUser;
  const share = ws / pair.games;
  if (share >= COLLUSION_WIN_SHARE_IMBALANCE || share <= 1 - COLLUSION_WIN_SHARE_IMBALANCE) {
    hits.push({
      reason: CoinflipFraudReason.COLLUSION_WIN_IMBALANCE,
      family: 'collusion',
      weight: 18,
      detail: `Win share imbalance on pair: smaller user wins ${(share * 100).toFixed(0)}% over n=${pair.games}`,
      tempShare: TEMP_SHARE.mid,
    });
  }

  const estVolCents = Math.max(
    MONEY_FLOW_MIN_CENTS,
    pair.games * 100,
  );
  if (
    Math.abs(pair.netFlowCentsToSmaller) >= MONEY_FLOW_SKEW_RATIO * estVolCents
  ) {
    hits.push({
      reason: CoinflipFraudReason.MONEY_FLOW_SKEW,
      family: 'economic',
      weight: 16,
      detail: `Directed net skew on pair flow ${pair.netFlowCentsToSmaller}c vs estVol ~${estVolCents}c`,
      tempShare: TEMP_SHARE.mid,
    });
  }

  return hits;
}

export function ruleBotTiming(snapshot: UserFraudSnapshot): FraudRuleHit | null {
  const lat = snapshot.joinLatenciesMs.filter((n) => n >= 0);
  if (lat.length < BOT_TIMING_MIN_SAMPLES) return null;
  const { mean, cv } = meanAndCv(lat);
  if (cv < BOT_JOIN_CV_MAX && mean < BOT_JOIN_MEAN_MS_MAX) {
    return {
      reason: CoinflipFraudReason.BOT_TIMING_LOW_VARIANCE,
      family: 'bot',
      weight: Math.min(24, 10 + (BOT_JOIN_CV_MAX - cv) * 80),
      detail: `Join latency mean=${mean.toFixed(0)}ms CV=${cv.toFixed(3)} (n=${lat.length})`,
      tempShare: TEMP_SHARE.high,
    };
  }
  return null;
}

export function ruleBetSpike(
  stakeCents: number,
  historyCents: number[],
): FraudRuleHit | null {
  if (historyCents.length < BET_SPIKE_MIN_HISTORY) return null;
  const sorted = [...historyCents].sort((a, b) => a - b);
  const med = median(sorted);
  if (med <= 0) return null;
  if (stakeCents < med * BET_SPIKE_MULTIPLIER) return null;
  return {
    reason: CoinflipFraudReason.BET_SPIKE_VS_HISTORY,
    family: 'statistical',
    weight: 12,
    detail: `Stake ${(stakeCents / 100).toFixed(2)} vs median hist ${(med / 100).toFixed(2)}`,
    tempShare: TEMP_SHARE.high,
  };
}

export function ruleSharedIp(_username: string, peers: string[]): FraudRuleHit | null {
  const distinct = new Set(peers);
  if (distinct.size < SHARED_IP_USER_THRESHOLD) return null;
  return {
    reason: CoinflipFraudReason.SHARED_IP_CLUSTER,
    family: 'identity',
    weight: Math.min(20, 8 + distinct.size * 3),
    detail: `Hashed IP bucket contains ${distinct.size} distinct accounts`,
    tempShare: TEMP_SHARE.mid,
  };
}

export function ruleSharedFp(_username: string, peers: string[]): FraudRuleHit | null {
  const distinct = new Set(peers);
  if (distinct.size < SHARED_FP_USER_THRESHOLD) return null;
  return {
    reason: CoinflipFraudReason.SHARED_DEVICE_CLUSTER,
    family: 'identity',
    weight: 16,
    detail: `Device fingerprint bucket contains ${distinct.size} accounts`,
    tempShare: TEMP_SHARE.mid,
  };
}

export function ruleGameTiming(
  joinMs?: number,
  readyMs?: number,
): FraudRuleHit | null {
  if (joinMs != null && joinMs >= 0 && joinMs < 80 && readyMs != null && readyMs < 120) {
    return {
      reason: CoinflipFraudReason.SUSPICIOUS_GAME_TIMING,
      family: 'game',
      weight: 10,
      detail: `Very fast join(${joinMs}ms)+ready(${readyMs}ms) pattern on this game`,
      tempShare: TEMP_SHARE.high,
    };
  }
  return null;
}

export function ruleMoneyFlowRing(
  adjacency: Map<string, Set<string>>,
): FraudRuleHit[] {
  const hits: FraudRuleHit[] = [];
  const seen = new Set<string>();
  for (const start of adjacency.keys()) {
    if (seen.has(start)) continue;
    const stack: string[][] = [[start]];
    while (stack.length) {
      const path = stack.pop()!;
      const cur = path[path.length - 1]!;
      const nbrs = adjacency.get(cur);
      if (!nbrs) continue;
      for (const n of nbrs) {
        if (n === start && path.length >= 3) {
          const key = [...path].sort().join('|');
          if (!seen.has(key)) {
            seen.add(key);
            hits.push({
              reason: CoinflipFraudReason.MONEY_FLOW_RING,
              family: 'economic',
              weight: 22,
              detail: `Circulation motif length ${path.length} around ${start}`,
              tempShare: TEMP_SHARE.low,
            });
          }
        } else if (!path.includes(n) && path.length < 6) {
          stack.push([...path, n]);
        }
      }
    }
  }
  return hits;
}
