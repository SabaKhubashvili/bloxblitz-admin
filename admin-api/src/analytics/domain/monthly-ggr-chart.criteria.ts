import type { DiceRollMode, GameType } from '@prisma/client';

export interface MonthlyGgrChartCriteria {
  /** Number of UTC calendar months to include (including partial current month). */
  monthCount: number;
  /** IANA id; month buckets use `timezone(tz, createdAt)` before truncation. */
  timeZone: string;
  gameType?: GameType;
  diceRollMode?: DiceRollMode;
}
