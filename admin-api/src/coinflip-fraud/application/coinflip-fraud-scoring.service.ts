import { Injectable } from '@nestjs/common';
import type { FraudRuleHit, ComputedRiskState } from '../domain/coinflip-fraud.risk.types';
import type { FraudRiskTier } from '../domain/coinflip-fraud.risk.types';
import { CoinflipFraudReason } from '../domain/coinflip-fraud.reasons';
import {
  TIER_CRITICAL_MIN,
  TIER_FLAGGED_MIN,
  TIER_LIMITED_MIN,
} from '../domain/coinflip-fraud.thresholds';

const FAMILY_WEIGHT_CAP: Record<FraudRuleHit['family'], number> = {
  statistical: 38,
  collusion: 40,
  economic: 34,
  bot: 28,
  identity: 24,
  game: 18,
};

@Injectable()
export class CoinflipFraudScoringService {
  /**
   * Combine independent detector outputs into a 0–100 score with fast/slow components.
   * Applies per-family caps, multi-signal amplification, and confidence shrinkage.
   */
  compute(args: {
    hits: FraudRuleHit[];
    gamesPlayed: number;
  }): ComputedRiskState {
    const byFamily = new Map<FraudRuleHit['family'], FraudRuleHit[]>();
    for (const h of args.hits) {
      const list = byFamily.get(h.family) ?? [];
      list.push(h);
      byFamily.set(h.family, list);
    }

    const capped: FraudRuleHit[] = [];
    for (const [fam, list] of byFamily) {
      const cap = FAMILY_WEIGHT_CAP[fam];
      let sum = 0;
      const picked: FraudRuleHit[] = [];
      for (const h of list.sort((a, b) => b.weight - a.weight)) {
        if (sum + h.weight > cap) {
          const room = cap - sum;
          if (room > 0) {
            picked.push({ ...h, weight: room });
            sum = cap;
          }
          break;
        }
        picked.push(h);
        sum += h.weight;
      }
      capped.push(...picked);
    }

    const distinctFamilies = new Set(capped.map((c) => c.family)).size;
    const distinctRules = new Set(capped.map((c) => c.reason)).size;

    const amplify =
      distinctFamilies >= 2 ? Math.min(1.45, 1 + 0.15 * (distinctFamilies - 1)) : 1;

    let temp = 0;
    let pers = 0;
    for (const h of capped) {
      const share = h.tempShare ?? 0.35;
      const w = h.weight * amplify;
      temp += w * share;
      pers += w * (1 - share);
    }

    let score = Math.min(100, temp + pers);
    /** Confidence: more games and more corroborating rules → admins can trust the score. */
    const confidence = Math.min(
      1,
      (Math.min(1, args.gamesPlayed / 80) * 0.55 +
        Math.min(1, distinctRules / 4) * 0.35 +
        Math.min(1, distinctFamilies / 4) * 0.1) *
        (distinctFamilies >= 2 || distinctRules >= 2 ? 1 : 0.72),
    );

    if (distinctFamilies < 2 && distinctRules < 2 && score > 52) {
      score = Math.min(score, 48);
    }

    const tier = this.tierFromScore(score);

    return {
      score,
      temporaryScore: Math.min(100, temp),
      persistentScore: Math.min(100, pers),
      confidence,
      tier,
      hits: capped,
      distinctFamilies,
    };
  }

  private tierFromScore(score: number): FraudRiskTier {
    if (score >= TIER_CRITICAL_MIN) return 'critical';
    if (score >= TIER_LIMITED_MIN) return 'limited';
    if (score >= TIER_FLAGGED_MIN) return 'flagged';
    return 'clean';
  }

  mergeReasons(hits: FraudRuleHit[]): CoinflipFraudReason[] {
    return [...new Set(hits.map((h) => h.reason))];
  }
}
