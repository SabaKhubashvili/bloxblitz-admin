import type { DiceRollMode, GameType } from '@prisma/client';
import type { WageringWindowKey } from './wagering-time-range';

/** Single-window aggregates (amounts as decimal strings). */
export interface WageringWindowSnapshot {
  from: string;
  to: string;
  totalWagered: string;
  totalPaidOut: string;
  /**
   * GGR — gross gaming revenue for the window (stakes minus payouts to players).
   * Positive when the house is ahead on settled play in `GameHistory`.
   */
  houseProfit: string;
  /** Count of settled `GameHistory` rows in the window. */
  betCount: number;
  /**
   * `houseProfit / betCount`; average GGR per settled bet.
   * Same magnitude as pooled average net user loss to the platform per bet when `GameHistory` is the full source of truth.
   */
  netUserLossPerBet: string;
}

export interface WageringStatsAppliedFilters {
  gameType?: GameType;
  diceRollMode?: DiceRollMode;
}

/** Full response when multiple windows are requested. */
export interface WageringStatsMultiWindowResult {
  windows: Record<WageringWindowKey, WageringWindowSnapshot>;
  appliedFilters: WageringStatsAppliedFilters;
}

/** Response when a single preset is requested. */
export interface WageringStatsSingleWindowResult {
  window: WageringWindowKey;
  stats: WageringWindowSnapshot;
  appliedFilters: WageringStatsAppliedFilters;
}

export type WageringStatsResult =
  | WageringStatsMultiWindowResult
  | WageringStatsSingleWindowResult;
