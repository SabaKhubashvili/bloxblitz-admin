import type { StatisticsChartGranularity } from './statistics-chart.types';

/**
 * Bucket width for charts: hourly for ≤48h, daily for medium spans, monthly beyond ~90d.
 */
export function resolveStatisticsChartGranularity(
  from: Date,
  to: Date,
): StatisticsChartGranularity {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const fortyEightHours = 48 * 60 * 60 * 1000;
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  if (ms <= fortyEightHours) return 'hour';
  if (ms <= ninetyDays) return 'day';
  return 'month';
}
