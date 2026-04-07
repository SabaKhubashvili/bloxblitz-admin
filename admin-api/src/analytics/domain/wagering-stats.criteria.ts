import type { DiceRollMode, GameType } from '@prisma/client';
import type { WageringTimeRangePreset, WageringWindowKey } from './wagering-time-range';

/**
 * Port / use-case input: which window(s) and optional product filters.
 */
export interface WageringStatsCriteria {
  /** If set, only this window is computed; otherwise all presets are returned. */
  singlePreset?: WageringTimeRangePreset;
  gameType?: GameType;
  diceRollMode?: DiceRollMode;
}

export interface WageringStatsWindowBounds {
  key: WageringWindowKey;
  from: Date;
  to: Date;
}
