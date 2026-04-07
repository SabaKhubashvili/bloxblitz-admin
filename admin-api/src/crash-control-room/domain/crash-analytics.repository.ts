export type CrashOverviewAggregate = {
  totalWagered: number;
  totalPayout: number;
  profitLoss: number;
  activePlayers: number;
  totalBets: number;
};

export type CrashMultiplierHistoryRow = {
  roundId: string;
  crashMultiplier: number;
  createdAt: Date;
};

export type CrashProfitLossHourRow = {
  bucketUtc: Date;
  profit: number;
  loss: number;
};

export type CrashPlayerActivityHourRow = {
  bucketUtc: Date;
  activePlayers: number;
};

export interface ICrashAnalyticsRepository {
  aggregateOverview(from: Date, to: Date): Promise<CrashOverviewAggregate>;
  listRecentCrashRounds(limit: number): Promise<CrashMultiplierHistoryRow[]>;
  aggregateProfitLossByUtcHour(
    fromInclusive: Date,
    toInclusive: Date,
  ): Promise<CrashProfitLossHourRow[]>;
  aggregateActivePlayersByUtcHour(
    fromInclusive: Date,
    toInclusive: Date,
  ): Promise<CrashPlayerActivityHourRow[]>;
}
