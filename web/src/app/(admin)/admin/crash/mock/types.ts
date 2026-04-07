export type TimeRange = "24h" | "7d" | "30d";

export type GameRunStatus = "running" | "paused";

export type PlayerRowStatus = "active" | "limited" | "banned";

export type Volatility = "low" | "medium" | "high";

export interface OverviewStats {
  totalWagered: number;
  totalProfitLoss: number;
  activePlayers: number;
  totalBetsCount: number;
  /** Set when loaded from admin-api crash control room */
  totalPayout?: number;
}

export interface CrashRoundRow {
  id: string;
  crashMultiplier: number;
  totalBets: number;
  totalPayout: number;
  profitLoss: number;
  timestamp: string;
  /** Extra detail for modal */
  largestBet: number;
  uniquePlayers: number;
  provablyFairHash: string;
}

export interface PlayerRow {
  id: string;
  username: string;
  totalWagered: number;
  profitLoss: number;
  betsCount: number;
  status: PlayerRowStatus;
}

export interface CrashGameConfig {
  minBet: number;
  maxBet: number;
  minCashout: number;
  maxMultiplierCap: number;
  houseEdgePercent: number;
  gameSpeed: number;
  rtpTarget: number;
  volatility: Volatility;
  tickRate: number;
}

export interface RiskLimits {
  maxTotalPayoutPerRound: number;
  maxProfitPerUser: number;
  maxLossPerUser: number;
  maxConcurrentBets: number;
  autoStopEnabled: boolean;
  cooldownEnabled: boolean;
}

export interface LiveStatsSnapshot {
  multiplier: number;
  totalBets: number;
  totalPayout: number;
  profitLoss: number;
  activePlayers: number;
}
