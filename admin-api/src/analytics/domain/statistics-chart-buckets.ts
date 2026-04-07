import type { StatisticsChartGranularity } from './statistics-chart.types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function startOfUtcHour(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      0,
      0,
      0,
    ),
  );
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * All bucket start instants in [from, to) aligned to UTC truncation (matches SQL date_trunc).
 */
export function listStatisticsChartBucketKeys(
  from: Date,
  to: Date,
  granularity: StatisticsChartGranularity,
): string[] {
  const keys: string[] = [];
  if (!(from < to)) return keys;

  if (granularity === 'hour') {
    let t = startOfUtcHour(from);
    while (t < to) {
      keys.push(t.toISOString());
      t = new Date(t.getTime() + HOUR_MS);
    }
    return keys;
  }

  if (granularity === 'day') {
    let t = startOfUtcDay(from);
    while (t < to) {
      keys.push(t.toISOString());
      t = new Date(t.getTime() + DAY_MS);
    }
    return keys;
  }

  let t = startOfUtcMonth(from);
  while (t < to) {
    keys.push(t.toISOString());
    t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  }
  return keys;
}

/** Normalize bucket timestamps from the DB to ISO strings for map keys. */
export function normalizeChartBucketKey(bucket: Date | string): string {
  const d = bucket instanceof Date ? bucket : new Date(bucket);
  if (Number.isNaN(d.getTime())) {
    return new Date(0).toISOString();
  }
  return d.toISOString();
}
