export type TimeRange = "24h" | "7d" | "30d";

export type SortDir = "asc" | "desc" | null;

export type CoinSide = "heads" | "tails";

export type ActiveGameStatus = "waiting" | "active";

export type DisputeStatus = "pending" | "reviewed";

export interface CoinflipPlayer {
  username: string;
  wager: number;
  side: CoinSide;
}

export interface ActiveCoinflipGame {
  id: string;
  player1: CoinflipPlayer;
  player2: CoinflipPlayer | null;
  status: ActiveGameStatus;
  createdAt: string;
}

export interface CoinflipHistoryRow {
  id: string;
  player1: string;
  player2: string;
  winner: string;
  totalPot: number;
  platformFee: number;
  result: CoinSide;
  timestamp: string;
}

export interface CoinflipDisputeRow {
  id: string;
  gameId: string;
  playersLabel: string;
  reason: string;
  status: DisputeStatus;
}

export interface PlayerCoinflipStat {
  id: string;
  username: string;
  gamesPlayed: number;
  totalWagered: number;
  wins: number;
  losses: number;
  profitLoss: number;
}

export interface CoinflipOverviewStats {
  totalGames: number;
  totalWagered: number;
  platformProfit: number;
  activeGamesCount: number;
}

export interface CoinflipConfig {
  minBet: number;
  maxBet: number;
  platformFeePercent: number;
  maxActiveGames: number;
  matchTimeoutMinutes: number;
  coinflipEnabled: boolean;
  publicGamesEnabled: boolean;
  privateGamesEnabled: boolean;
}

export interface CoinflipRiskLimits {
  maxWagerPerUser: number;
  maxDailyWagerPerUser: number;
  maxPotSize: number;
  maxConcurrentGamesPerUser: number;
  autoCancelSuspicious: boolean;
  antiAbuseEnabled: boolean;
}

export type FeedEventType =
  | "created"
  | "joined"
  | "resolved"
  | "cancelled"
  | "system";

export interface FeedItem {
  id: string;
  type: FeedEventType;
  message: string;
  timestamp: string;
  highlight?: boolean;
}
