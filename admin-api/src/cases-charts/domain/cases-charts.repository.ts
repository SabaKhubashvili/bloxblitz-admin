export type CasesChartBucketGranularity = 'hour' | 'day';

export type CasesChartSeriesRow = {
  bucketUtc: Date;
  value: number;
};

export type PopularCaseByOpensRow = {
  caseId: string;
  name: string;
  price: number;
  opens: number;
};

export interface ICasesChartsRepository {
  findMostPopularCasesByOpens(
    fromInclusive: Date,
    toExclusive: Date,
    limit: number,
  ): Promise<PopularCaseByOpensRow[]>;

  aggregateRevenueSeries(
    fromInclusive: Date,
    toExclusive: Date,
    bucket: CasesChartBucketGranularity,
  ): Promise<CasesChartSeriesRow[]>;

  aggregateOpeningsSeries(
    fromInclusive: Date,
    toExclusive: Date,
    bucket: CasesChartBucketGranularity,
  ): Promise<CasesChartSeriesRow[]>;
}
