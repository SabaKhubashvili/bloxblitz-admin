export type MinesHistoryStatusDto = 'cashed_out' | 'lost';

export type MinesHistoryGameDto = {
  id: string;
  userId: string;
  betAmount: number;
  payout: number;
  multiplier: number;
  status: MinesHistoryStatusDto;
  createdAt: string;
};

export type MinesHistoryResponseDto = {
  games: MinesHistoryGameDto[];
};
