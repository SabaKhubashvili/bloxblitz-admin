import { GameStatus } from '@prisma/client';

/**
 * Rows that count toward platform wagering aggregates (excludes in-flight and cancelled).
 */
export const WAGERING_STATS_SETTLED_STATUSES: GameStatus[] = [
  GameStatus.FINISHED,
  GameStatus.WON,
  GameStatus.LOST,
  GameStatus.CASHED_OUT,
];
