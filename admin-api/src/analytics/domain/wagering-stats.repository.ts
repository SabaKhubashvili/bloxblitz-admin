import type { MonthlyGgrChartCriteria } from './monthly-ggr-chart.criteria';
import type { MonthlyGgrChartBucket } from './monthly-ggr-chart.types';
import type { WageringStatsWindowBounds } from './wagering-stats.criteria';
import type { WageringWindowSnapshot } from './wagering-stats-snapshot';
import type {
  StatisticsChartDatum,
  StatisticsChartGranularity,
} from './statistics-chart.types';

export interface IWageringStatsRepository {
  aggregateWindow(
    bounds: WageringStatsWindowBounds,
    filters: { gameType?: string; diceRollMode?: string },
  ): Promise<WageringWindowSnapshot>;

  aggregateMonthlyGgrBuckets(
    criteria: MonthlyGgrChartCriteria,
    range: { from: Date; to: Date },
  ): Promise<MonthlyGgrChartBucket[]>;

  aggregateStatisticsChartBuckets(
    range: { from: Date; to: Date },
    granularity: StatisticsChartGranularity,
    filters: { gameType?: string; diceRollMode?: string },
  ): Promise<StatisticsChartDatum[]>;
}
