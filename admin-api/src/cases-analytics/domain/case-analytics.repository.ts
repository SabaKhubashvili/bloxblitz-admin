export type CaseAnalyticsOverviewAggregate = {
  totalOpened: number;
  /** Gross currency collected: SUM(pricePaid). */
  revenue: number;
  /** Player return %: SUM(wonItemValue) / SUM(pricePaid) * 100 (0 if no spend). */
  avgRtp: number;
};

export type CaseMostWonItemRow = {
  name: string;
  dropCount: number;
};

export type CaseOpenRateBucketRow = {
  bucketUtc: Date;
  openCount: number;
};

export type CaseDropDistributionRow = {
  itemName: string;
  dropCount: number;
};

export interface ICaseAnalyticsRepository {
  assertCaseExists(caseId: string): Promise<boolean>;
  aggregateOverview(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<CaseAnalyticsOverviewAggregate>;
  findMostWonItems(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
    limit: number,
  ): Promise<CaseMostWonItemRow[]>;
  aggregateOpenRate(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
    granularity: 'hour' | 'day',
  ): Promise<CaseOpenRateBucketRow[]>;
  aggregateDropDistribution(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<CaseDropDistributionRow[]>;
}
