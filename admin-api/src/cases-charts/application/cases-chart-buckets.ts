import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import {
  formatUtcDayLabel,
  last24HourChartContext,
  rollingWindowBounds,
  utcTruncateToDay,
  utcTruncateToHour,
} from '../../common/rolling-analytics-window';
import type { CasesChartSeriesRow } from '../domain/cases-charts.repository';

const MS_DAY = 24 * 60 * 60 * 1000;

export type CasesChartBucketPlan = {
  granularity: 'hour' | 'day';
  labels: string[];
  bucketStartsUtc: Date[];
  queryFromInclusive: Date;
  queryToExclusive: Date;
};

function utcDayRangeInclusive(from: Date, to: Date): Date[] {
  const start = utcTruncateToDay(from);
  const end = utcTruncateToDay(to);
  const out: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    out.push(new Date(t));
  }
  return out;
}

export function buildCasesChartBucketPlan(
  range: RollingAnalyticsPreset,
  now: Date,
): CasesChartBucketPlan {
  if (range === '24h') {
    const ctx = last24HourChartContext(now);
    return {
      granularity: 'hour',
      bucketStartsUtc: ctx.bucketStartsUtc,
      labels: ctx.bucketStartsUtc.map((b) => b.toISOString()),
      queryFromInclusive: ctx.queryFromInclusive,
      queryToExclusive: new Date(now.getTime()),
    };
  }
  const { from, to } = rollingWindowBounds(range, now);
  const bucketStartsUtc = utcDayRangeInclusive(from, to);
  return {
    granularity: 'day',
    bucketStartsUtc,
    labels: bucketStartsUtc.map((b) => formatUtcDayLabel(b)),
    queryFromInclusive: from,
    queryToExclusive: to,
  };
}

export function mergeSeriesIntoBuckets(
  plan: CasesChartBucketPlan,
  rows: CasesChartSeriesRow[],
): number[] {
  const byTime = new Map<number, number>();
  for (const r of rows) {
    const t =
      plan.granularity === 'hour'
        ? utcTruncateToHour(new Date(r.bucketUtc)).getTime()
        : utcTruncateToDay(new Date(r.bucketUtc)).getTime();
    byTime.set(t, r.value);
  }
  return plan.bucketStartsUtc.map((b) => byTime.get(b.getTime()) ?? 0);
}
