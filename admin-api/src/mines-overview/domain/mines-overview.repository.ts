export type MinesOverviewStatsRow = {
  totalGamesPlayed: number;
  totalWagered: number;
  totalProfitLoss: number;
  activePlayers: number;
  avgCashoutMultiplier: number;
};

export type MinesOverviewChartBucketRow = {
  bucket: Date;
  gamesPlayed: number;
  profitLoss: number;
  avgMultiplier: number;
};

export interface IMinesOverviewRepository {
  aggregateStats(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<MinesOverviewStatsRow>;

  aggregateChartBuckets(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<MinesOverviewChartBucketRow[]>;
}
