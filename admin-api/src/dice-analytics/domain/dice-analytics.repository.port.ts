export type DiceOverviewMetricsRow = {
  totalRolls: number;
  totalWagered: number;
  /** Platform net: sum(betAmount) − sum(payout). */
  profit: number;
  activePlayers: number;
};

export type DiceRollDistributionRow = {
  value: number;
  count: number;
};

export type DiceProfitBucketRow = {
  bucket: Date;
  /** sum(betAmount) − sum(payout) for the bucket. */
  net: number;
};

export type DiceBetRangeRow = {
  range: string;
  count: number;
};

export type DiceRecentGamesSideFilter = 'all' | 'over' | 'under';

export type DiceRecentGamesListFilter = {
  player?: string;
  /** Applied only when > 0 (0 means no minimum filter). */
  minBet?: number;
  side: DiceRecentGamesSideFilter;
};

export type DiceRecentGameRow = {
  id: string;
  userUsername: string;
  betAmount: number;
  payout: number;
  profit: number;
  rollResult: number;
  chance: number;
  rollMode: 'OVER' | 'UNDER';
  createdAt: Date;
};

export type DiceTargetRangePctRow = { range: string; pct: number };

export type DiceScatterSeries = { low: [number, number][]; high: [number, number][] };

export type DiceRiskPostureRow = {
  riskCounts: { low: number; medium: number; high: number };
  winRateByStake: { low: number[]; high: number[] };
  avgWinMultiplier: number;
};

export type DiceScatterQueryOpts = {
  player?: string;
  minBet?: number;
  maxBet?: number;
};

export type DicePlayersSortField =
  | 'rolls'
  | 'wagered'
  | 'winRate'
  | 'profitLoss'
  | 'username'
  | 'risk'
  | 'status';

export type DicePlayersModerationFilter = 'active' | 'limited' | 'banned';

export type DicePlayersListFilter = {
  /** Partial match, case-insensitive. */
  username?: string;
  limit: number;
  offset: number;
  sort?: DicePlayersSortField;
  order?: 'asc' | 'desc';
  moderationStatus?: DicePlayersModerationFilter;
};

export type DicePlayerAggregateDbRow = {
  username: string;
  rolls: number;
  wagered: number;
  wins: number;
  profitLoss: number;
  avgChance: number;
  betStddev: number | null;
  betMean: number;
  /** From `DicePlayerControl` join — `null` means active (no row or unknown). */
  moderationStatus: string | null;
  moderationMaxBet: number | null;
};

export interface IDiceAnalyticsRepository {
  aggregateOverview(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceOverviewMetricsRow>;

  /** One row per integer 0..100 (counts may be zero). */
  aggregateRollDistribution(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceRollDistributionRow[]>;

  aggregateProfitByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<DiceProfitBucketRow[]>;

  /** Fixed order: 0–1, 1–10, 10–100, 100+ */
  aggregateBetSizeHistogram(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceBetRangeRow[]>;

  findRecentDiceGames(
    filters: DiceRecentGamesListFilter,
    limit: number,
  ): Promise<DiceRecentGameRow[]>;

  /** 10×10 grid: row major, cell [ri][ci] = count for outcome indices ri*10+ci (0–99). */
  aggregateRollHeatmap10x10(
    fromInclusive: Date,
    toExclusive: Date,
    player?: string,
  ): Promise<number[][]>;

  /** Percentage of bets by target/chance decile (0–10 … 90–100). */
  aggregateTargetChanceRanges(
    fromInclusive: Date,
    toExclusive: Date,
    player?: string,
  ): Promise<DiceTargetRangePctRow[]>;

  aggregateWinRateScatter(
    fromInclusive: Date,
    toExclusive: Date,
    opts?: DiceScatterQueryOpts,
  ): Promise<DiceScatterSeries>;

  aggregateRiskPosture(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceRiskPostureRow>;

  /** All-time per-user aggregates from `DiceBet`, with pagination. */
  listDicePlayersAggregates(
    filter: DicePlayersListFilter,
  ): Promise<{ rows: DicePlayerAggregateDbRow[]; total: number }>;

  /** Single-user dice aggregate; `null` if user has never placed a dice bet. */
  aggregateOneDicePlayer(
    username: string,
  ): Promise<DicePlayerAggregateDbRow | null>;
}
