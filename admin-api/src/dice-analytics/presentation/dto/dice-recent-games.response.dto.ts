export type RecentDiceGameDto = {
  id: string;
  player: string;
  betAmount: number;
  payout: number;
  profit: number;
  roll: number;
  target: number;
  side: 'over' | 'under';
  createdAt: string;
};

export type RecentDiceGamesResponseDto = {
  games: RecentDiceGameDto[];
};
