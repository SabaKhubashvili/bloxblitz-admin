import type { CoinflipFraudReason } from './coinflip-fraud.reasons';

export type FraudRiskTier = 'clean' | 'flagged' | 'limited' | 'critical';

export type FraudTriggerFamily =
  | 'statistical'
  | 'collusion'
  | 'economic'
  | 'bot'
  | 'identity'
  | 'game';

export interface FraudRuleHit {
  reason: CoinflipFraudReason;
  family: FraudTriggerFamily;
  /** 0–40 typical per rule before caps */
  weight: number;
  /** Human-readable context for admins */
  detail: string;
  /** 0–1 share counted toward temporary (fast-decay) risk. */
  tempShare?: number;
}

export interface ComputedRiskState {
  score: number;
  temporaryScore: number;
  persistentScore: number;
  confidence: number;
  tier: FraudRiskTier;
  hits: FraudRuleHit[];
  distinctFamilies: number;
}

export interface UserRiskHashState {
  score: number;
  temporaryScore: number;
  persistentScore: number;
  confidence: number;
  tier: FraudRiskTier;
  reasons: CoinflipFraudReason[];
  updatedAtMs: number;
}
