export type TimeRange = "24h" | "7d" | "30d";

export type SortDir = "asc" | "desc" | null;

export type DiceSide = "over" | "under";

export interface DiceOverviewStats {
  totalRolls: number;
  totalWagered: number;
  totalProfitLoss: number;
  activePlayers: number;
}

export interface DiceGameConfig {
  minBet: number;
  maxBet: number;
  minRoll: number;
  maxRoll: number;
  houseEdgePercent: number;
  rtpTarget: number;
  maxPayoutMultiplier: number;
}

export interface DiceRiskLimits {
  maxWagerPerUser: number;
  maxProfitPerUser: number;
  maxLossPerUser: number;
  maxPayoutPerRoll: number;
  autoStopLargeLosses: boolean;
  cooldownAfterBigWins: boolean;
}

export interface DiceHistoryRow {
  id: string;
  username: string;
  betAmount: number;
  side: DiceSide;
  targetValue: number;
  rollResult: number;
  multiplier: number;
  profitLoss: number;
  timestamp: string;
}

export interface DiceLiveRoll {
  id: string;
  username: string;
  bet: number;
  side: DiceSide;
  target: number;
  /** null while animating */
  result: number | null;
  multiplier: number;
  won: boolean | null;
  startedAt: number;
}

export interface DicePlayerStat {
  id: string;
  username: string;
  totalRolls: number;
  totalWagered: number;
  winRate: number;
  profitLoss: number;
  riskProfile: "low" | "medium" | "high";
}
