import type { GameStatus } from '@prisma/client';

export type MinesPlayerModerationStatus =
  | 'ACTIVE'
  | 'BANNED'
  | 'LIMITED';

export type MinesPlayerRowDto = {
  id: string;
  username: string;
  totalGames: number;
  /** Completed rounds counted as wins (CASHED_OUT or WON). */
  totalWins: number;
  totalWagered: number;
  avgTilesCleared: number;
  profitLoss: number;
  /** From Redis `mines:control:{username}` only — empty key is ACTIVE. */
  moderationStatus: MinesPlayerModerationStatus;
  maxBetAmount: number | null;
  maxGamesPerHour: number | null;
};

export type MinesPlayersResponseDto = {
  players: MinesPlayerRowDto[];
  total: number;
  page: number;
  limit: number;
};

export type MinesPlayerRoundDto = {
  id: string;
  username: string;
  betAmount: number;
  minesCount: number;
  tilesCleared: number;
  cashoutMultiplier: number;
  profitLoss: number;
  timestamp: string;
  gridSize: number;
  status: GameStatus;
  mineIndices: number[];
  revealedIndices: number[];
};

export type MinesPlayerHistoryResponseDto = {
  rounds: MinesPlayerRoundDto[];
};
