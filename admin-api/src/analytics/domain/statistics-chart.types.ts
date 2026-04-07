export type StatisticsChartGranularity = 'hour' | 'day' | 'month';

export type StatisticsChartDatum = {
  date: string;
  totalWagered: string;
  totalPaidOut: string;
  totalUserLoss: string;
};

export type StatisticsChartResult = {
  series: StatisticsChartDatum[];
  meta: {
    from: string;
    to: string;
    granularity: StatisticsChartGranularity;
    preset?: string;
    appliedFilters: Record<string, unknown>;
  };
};
