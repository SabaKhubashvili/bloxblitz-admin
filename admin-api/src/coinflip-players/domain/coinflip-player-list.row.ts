import type { CoinflipPlayerPublicStatus } from './coinflip-player-public-status';

export type CoinflipPlayerListLimits = {
  maxWagerAmount: string | null;
  maxGamesPerHour: number | null;
};

export type CoinflipPlayerListRow = {
  userId: string;
  username: string;
  totalGames: number;
  totalWagered: string;
  wins: number;
  losses: number;
  winRate: number;
  profitLoss: string;
  status: CoinflipPlayerPublicStatus;
  limits: CoinflipPlayerListLimits | null;
};

export type CoinflipPlayersListPage = {
  items: CoinflipPlayerListRow[];
  total: number;
};
