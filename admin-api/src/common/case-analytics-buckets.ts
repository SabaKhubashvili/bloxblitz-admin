import type { RollingAnalyticsPreset } from './rolling-analytics-window';
import {
  formatUtcDayLabel,
  utcTruncateToDay,
  utcTruncateToHour,
} from './rolling-analytics-window';

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** UTC hour bucket key aligned with `date_trunc('hour', ... AT TIME ZONE 'UTC')`. */
export function utcHourBucketKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:00:00.000Z`;
}

export function bucketKeyForOpenRate(
  range: RollingAnalyticsPreset,
  bucket: Date,
): string {
  if (range === '24h') return utcHourBucketKey(bucket);
  return formatUtcDayLabel(utcTruncateToDay(bucket));
}

/**
 * Ordered bucket labels (UTC) covering the query window. Matches SQL `date_trunc`
 * grouping so empty buckets can be filled with 0. Day presets use every UTC calendar
 * day from `fromInclusive` through `toExclusive` (exclusive end).
 */
export function buildOpenRateBucketKeys(
  range: RollingAnalyticsPreset,
  fromInclusive: Date,
  toExclusive: Date,
): string[] {
  if (range === '24h') {
    const n = 24;
    const endHour = utcTruncateToHour(new Date(toExclusive.getTime() - 1));
    return Array.from({ length: n }, (_, i) =>
      utcHourBucketKey(
        new Date(endHour.getTime() - (n - 1 - i) * MS_HOUR),
      ),
    );
  }
  const start = utcTruncateToDay(fromInclusive);
  const end = utcTruncateToDay(new Date(toExclusive.getTime() - 1));
  const keys: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += MS_DAY) {
    keys.push(formatUtcDayLabel(new Date(t)));
  }
  return keys;
}

export function openRateSqlGranularity(
  range: RollingAnalyticsPreset,
): 'hour' | 'day' {
  return range === '24h' ? 'hour' : 'day';
}
