export type TowersPlayerRowDto = {
  username: string;
  totalGamesPlayed: number;
  totalWagered: number;
  netProfitLoss: number;
  avgMultiplier: number;
};

export type TowersPlayerDetailResponseDto = {
  username: string;
  totalGamesPlayed: number;
  totalWagered: number;
  netProfitLoss: number;
  avgMultiplier: number;
  recentGames: {
    id: string;
    betAmount: number;
    profit: number;
    multiplier: number;
    outcome: 'win' | 'loss' | 'cashout';
    createdAt: string;
  }[];
};
