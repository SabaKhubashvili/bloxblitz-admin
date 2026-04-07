export type CoinflipOverviewStatsRow = {
  totalGames: number;
  totalWagered: number;
};

export type CoinflipChartBucketRow = {
  bucket: Date;
  games: number;
  wager: number;
};

export type CoinflipPlayerBucketRow = {
  bucket: Date;
  uniquePlayers: number;
};

export interface ICoinflipOverviewRepository {
  /**
   * Settled coinflip games in [fromInclusive, toExclusive) on GameHistory.createdAt.
   */
  aggregateStats(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<CoinflipOverviewStatsRow>;

  aggregateGamesAndWagerByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<CoinflipChartBucketRow[]>;

  aggregateUniquePlayersByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<CoinflipPlayerBucketRow[]>;
}
