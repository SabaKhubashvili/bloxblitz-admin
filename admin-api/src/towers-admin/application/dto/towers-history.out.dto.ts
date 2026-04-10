import type { TowersGameStatus } from '@prisma/client';

export type TowersHistoryGameDto = {
  id: string;
  userId: string;
  betAmount: number;
  profit: number;
  multiplier: number;
  outcome: 'win' | 'loss' | 'cashout';
  difficulty: string | null;
  levels: number | null;
  towersDetailStatus: TowersGameStatus | null;
  createdAt: string;
};

export type TowersHistoryResponseDto = {
  games: TowersHistoryGameDto[];
  total: number;
  page: number;
  limit: number;
};
