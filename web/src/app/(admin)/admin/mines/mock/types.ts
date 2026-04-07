export type TimeRange = "24h" | "7d" | "30d";

export type SortDir = "asc" | "desc" | null;

export type RiskLevel = "low" | "medium" | "high";

export interface MinesOverviewStats {
  totalGamesPlayed: number;
  totalWagered: number;
  totalProfitLoss: number;
  activePlayers: number;
  /** Average multiplier on cashed-out (WON) games only */
  avgCashoutMultiplier: number;
}

export interface MinesGameConfig {
  minBet: number;
  maxBet: number;
  gridSize: number;
  defaultMinesCount: number;
  maxMinesAllowed: number;
  houseEdgePercent: number;
  rtpTarget: number;
  gameSpeedMs: number;
}

export interface MinesRiskLimits {
  maxWagerPerUser: number;
  maxLossPerUser: number;
  maxProfitPerUser: number;
  maxConcurrentGames: number;
  autoStopEnabled: boolean;
  cooldownAfterBigWins: boolean;
}

export interface MinesHistoryRow {
  id: string;
  username: string;
  betAmount: number;
  minesCount: number;
  tilesCleared: number;
  cashoutMultiplier: number;
  profitLoss: number;
  timestamp: string;
  gridSize?: number;
  /** For modal / debug — which cells were mines (flat index 0..n-1) */
  mineIndices: number[];
  revealedIndices: number[];
}

export type MinesModerationUiStatus = "ACTIVE" | "BANNED" | "LIMITED";

export interface MinesPlayerStat {
  id: string;
  username: string;
  totalGames: number;
  totalWins: number;
  totalWagered: number;
  avgTilesCleared: number;
  profitLoss: number;
  moderationStatus: MinesModerationUiStatus;
  maxBetAmount: number | null;
  maxGamesPerHour: number | null;
}

export interface MinesLiveGame {
  id: string;
  username: string;
  bet: number;
  minesCount: number;
  gridSize: number;
  tilesRevealed: number;
  potentialPayout: number;
  hitMine: boolean;
  /** Admin preview — actual mine positions (mock) */
  mineIndices: number[];
  /** Flat grid: null = hidden, true = safe revealed, false = mine (if exploded) */
  cells: (boolean | null)[];
}
