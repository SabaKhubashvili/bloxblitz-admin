export type TowersOverviewStatsRow = {
  totalGamesPlayed: number;
  totalWagered: number;
  totalProfitLoss: number;
  activePlayers: number;
  avgCashoutMultiplier: number;
};

export type TowersOverviewChartBucketRow = {
  bucket: Date;
  gamesPlayed: number;
  profitLoss: number;
  avgMultiplier: number;
};

export interface ITowersOverviewRepository {
  aggregateStats(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<TowersOverviewStatsRow>;

  aggregateChartBuckets(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<TowersOverviewChartBucketRow[]>;
}
