import { Injectable, Logger } from '@nestjs/common';
import type { CoinflipFraudPayoutCompletedPayload } from '../domain/coinflip-fraud.events';
import { CoinflipFraudRedisRepository } from '../infrastructure/coinflip-fraud.redis-repository';
import { CoinflipFraudScoringService } from './coinflip-fraud-scoring.service';
import {
  ruleBetSpike,
  ruleBotTiming,
  ruleCollusionPair,
  ruleEvDeviation,
  ruleGameTiming,
  ruleSharedFp,
  ruleSharedIp,
  ruleWinRate,
} from './rules/coinflip-fraud-rules';
import type { FraudRuleHit } from '../domain/coinflip-fraud.risk.types';
import { CoinflipFraudReason } from '../domain/coinflip-fraud.reasons';
import {
  AUTO_LIMIT_DISTINCT_FAMILIES,
  AUTO_LIMIT_MAX_BET_SCALE_BPS,
  AUTO_LIMIT_SCORE_MIN,
  TIER_CRITICAL_MIN,
  TIER_FLAGGED_MIN,
  TIER_LIMITED_MIN,
} from '../domain/coinflip-fraud.thresholds';
import type { FraudRiskTier } from '../domain/coinflip-fraud.risk.types';

@Injectable()
export class CoinflipFraudPayoutProcessor {
  private readonly log = new Logger(CoinflipFraudPayoutProcessor.name);

  constructor(
    private readonly redis: CoinflipFraudRedisRepository,
    private readonly scoring: CoinflipFraudScoringService,
  ) {}

  async process(payload: CoinflipFraudPayoutCompletedPayload): Promise<void> {
    const claimed = await this.redis.tryClaimPayoutProcessed(payload.gameId);
    if (!claimed) return;

    const { stakeCents, payoutWinnerCents, houseEdge } =
      this.redis.extractPayoutPrimitives(payload);

    if (payload.player1IsBot && payload.player2IsBot) {
      return;
    }

    const joinMs =
      payload.joinedAtMs != null && payload.createdAtMs != null
        ? Math.max(0, payload.joinedAtMs - payload.createdAtMs)
        : undefined;
    const readyMs =
      payload.resultCommittedAtMs != null && payload.joinedAtMs != null
        ? Math.max(0, payload.resultCommittedAtMs - payload.joinedAtMs)
        : undefined;

    const p1 = payload.player1Username;
    const p2 = payload.player2Username;
    const winner = payload.winnerUsername;
    const isPvp = !payload.player1IsBot && !payload.player2IsBot;

    const humans: { username: string; isP1: boolean; isBot: boolean }[] = [
      { username: p1, isP1: true, isBot: payload.player1IsBot },
      { username: p2, isP1: false, isBot: payload.player2IsBot },
    ].filter((h) => !h.isBot);

    const stakeHistBefore = new Map<string, number[]>();
    for (const h of humans) {
      stakeHistBefore.set(h.username, await this.redis.loadStakeHistoryCents(h.username));
    }

    const [smaller, larger] = p1 < p2 ? [p1, p2] : [p2, p1];
    const winnerIsSmaller = winner === smaller;

    /** Smaller user's net profit in cents for this match (both stakes equal). */
    const profitSmallerCents =
      winner === smaller ? payoutWinnerCents - stakeCents : -stakeCents;

    for (const h of humans) {
      const won = h.username === winner;
      const opp =
        h.isP1 && !payload.player2IsBot
          ? p2
          : !h.isP1 && !payload.player1IsBot
            ? p1
            : undefined;

      const payoutCents = won ? payoutWinnerCents : 0;
      const expectedWinShareCents = Math.round(stakeCents * 0.5);
      const expectedNetCents = Math.round(-stakeCents * houseEdge);
      const actualNetCents = won ? payoutWinnerCents - stakeCents : -stakeCents;

      await this.redis.recordHumanUserPayout({
        username: h.username,
        gameId: payload.gameId,
        ts: payload.payoutAtMs,
        won,
        stakeCents,
        payoutCents,
        expectedWinShareCents,
        expectedNetCents,
        actualNetCents,
        opponent: opp,
        joinLatencyMs: h.isP1 ? undefined : joinMs,
        readyLatencyMs: h.isP1 ? undefined : readyMs,
        // Pair aggregates must advance once per match (not per side).
        pair:
          isPvp && opp && h.username === smaller
            ? {
                smaller,
                larger,
                winnerIsSmaller,
              }
            : undefined,
      });

      if (h.isP1 && payload.creatorIpHash) {
        await this.redis.addIdentityUser('ip', payload.creatorIpHash, h.username);
      }
      if (!h.isP1 && payload.joinerIpHash) {
        await this.redis.addIdentityUser('ip', payload.joinerIpHash, h.username);
      }
      if (h.isP1 && payload.creatorFingerprint) {
        await this.redis.addIdentityUser('fp', payload.creatorFingerprint, h.username);
      }
      if (!h.isP1 && payload.joinerFingerprint) {
        await this.redis.addIdentityUser('fp', payload.joinerFingerprint, h.username);
      }
    }

    if (isPvp) {
      await this.redis.updatePairFlowNet(smaller, larger, profitSmallerCents);
      await this.redis.recordDirectedStakeFlow(
        payload.loserUsername,
        payload.winnerUsername,
        stakeCents,
      );
    }

    let pairHitsShared: FraudRuleHit[] = [];
    if (isPvp) {
      const pairSnap = await this.redis.loadPairSnapshot(p1, p2);
      if (pairSnap) {
        pairHitsShared = ruleCollusionPair(p1, p2, pairSnap);
      }
    }

    const gameHits: FraudRuleHit[] = [];
    const gt = ruleGameTiming(joinMs, readyMs);
    if (gt) gameHits.push(gt);

    let maxGameScore = 0;
    for (const gh of gameHits) {
      maxGameScore += gh.weight;
    }
    if (pairHitsShared.length && isPvp) {
      maxGameScore += 8;
    }

    const gameReasons = [
      ...new Set([
        ...gameHits.map((h) => h.reason),
        ...(pairHitsShared.length
          ? [CoinflipFraudReason.COLLUSION_REPEATED_PAIR]
          : []),
      ]),
    ];

    if (maxGameScore >= 12) {
      await this.redis.writeGameRisk(
        payload.gameId,
        Math.min(100, maxGameScore),
        gameReasons.map(String),
      );
    }

    for (const h of humans) {
      const snap = await this.redis.loadUserSnapshot(h.username);
      if (!snap) continue;

      const hits: FraudRuleHit[] = [];
      const wr = ruleWinRate(snap);
      const ev = ruleEvDeviation(snap);
      const bot = ruleBotTiming(snap);
      const bet = ruleBetSpike(
        stakeCents,
        stakeHistBefore.get(h.username) ?? [],
      );

      if (wr) hits.push(wr);
      if (ev) hits.push(ev);
      if (bot) hits.push(bot);
      if (bet) hits.push(bet);
      if (gt) hits.push(gt);

      const ipHash = h.isP1 ? payload.creatorIpHash : payload.joinerIpHash;
      if (ipHash) {
        const peers = await this.redis.getIdentityUsers('ip', ipHash);
        const ipHit = ruleSharedIp(h.username, peers);
        if (ipHit) hits.push(ipHit);
      }
      const fp = h.isP1 ? payload.creatorFingerprint : payload.joinerFingerprint;
      if (fp) {
        const peers = await this.redis.getIdentityUsers('fp', fp);
        const fpHit = ruleSharedFp(h.username, peers);
        if (fpHit) hits.push(fpHit);
      }

      if (isPvp) {
        for (const ph of pairHitsShared) {
          hits.push({ ...ph });
        }
      }

      const prior = await this.redis.readUserRiskState(h.username);
      const computed = this.scoring.compute({
        hits,
        gamesPlayed: snap.stats.games,
      });

      const mergedTemp =
        (prior?.temporaryScore ?? 0) * 0.35 + computed.temporaryScore * 0.65;
      const mergedPers =
        (prior?.persistentScore ?? 0) * 0.55 + computed.persistentScore * 0.45;
      let score = Math.min(100, mergedTemp + mergedPers);

      if (computed.distinctFamilies < 2 && computed.hits.length < 2) {
        score = Math.min(score, 47);
      }

      const state = {
        score,
        temporaryScore: mergedTemp,
        persistentScore: mergedPers,
        confidence: computed.confidence,
        tier: this.tierFromMergedScore(score),
        reasons: this.scoring.mergeReasons(computed.hits),
        updatedAtMs: Date.now(),
      };

      await this.redis.writeUserRiskState(h.username, state);

      await this.maybeAutoLimit(h.username, { ...computed, score });
    }
  }

  private tierFromMergedScore(score: number): FraudRiskTier {
    if (score >= TIER_CRITICAL_MIN) return 'critical';
    if (score >= TIER_LIMITED_MIN) return 'limited';
    if (score >= TIER_FLAGGED_MIN) return 'flagged';
    return 'clean';
  }

  /**
   * Never auto-bans: only tightens economic levers when multiple independent families agree.
   */
  private async maybeAutoLimit(
    username: string,
    computed: ReturnType<CoinflipFraudScoringService['compute']> & { score: number },
  ): Promise<void> {
    if (
      computed.score < AUTO_LIMIT_SCORE_MIN ||
      computed.distinctFamilies < AUTO_LIMIT_DISTINCT_FAMILIES
    ) {
      return;
    }
    const existing = await this.redis.getMitigationFields(username);
    if (existing?.manual === '1') return;

    await this.redis.setMitigationFields(username, {
      maxBetScaleBps: String(AUTO_LIMIT_MAX_BET_SCALE_BPS),
      source: 'auto',
      autoAt: String(Date.now()),
      reason: 'multi_signal_fraud_score',
    });
  }
}
