/**
 * Shared rolling-window helpers for admin analytics (aligned with wagering presets 24h / 7d / 30d).
 */
export type RollingAnalyticsPreset = '24h' | '7d' | '30d';

/** Presets including all-time stats (used by Towers admin; charts may use a shorter window). */
export type RollingAnalyticsPresetWithAll = RollingAnalyticsPreset | 'all';

export const MS_HOUR = 60 * 60 * 1000;
export const MS_DAY = 24 * MS_HOUR;

export function rollingWindowBounds(
  preset: RollingAnalyticsPreset,
  now: Date,
): { from: Date; to: Date } {
  const to = new Date(now.getTime());
  const ms =
    preset === '24h'
      ? MS_DAY
      : preset === '7d'
        ? 7 * MS_DAY
        : 30 * MS_DAY;
  return { from: new Date(to.getTime() - ms), to };
}

export function rollingWindowBoundsWithAll(
  preset: RollingAnalyticsPresetWithAll,
  now: Date,
): { from: Date; to: Date } {
  if (preset === 'all') {
    return { from: new Date(0), to: new Date(now.getTime()) };
  }
  return rollingWindowBounds(preset, now);
}

/** Truncate to the start of the hour in UTC. */
export function utcTruncateToHour(d: Date): Date {
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

/** Start of UTC calendar day for `d`. */
export function utcTruncateToDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

/** `YYYY-MM-DD` in UTC (for day-bucket chart labels). */
export function formatUtcDayLabel(dayStartUtc: Date): string {
  const y = dayStartUtc.getUTCFullYear();
  const m = String(dayStartUtc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dayStartUtc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatUtcHourLabel(bucketStart: Date): string {
  const h = String(bucketStart.getUTCHours()).padStart(2, '0');
  return `${h}:00`;
}

/**
 * Last 24 UTC hour buckets ending at the current UTC hour start, plus the query window for crash chart endpoints.
 */
export function last24HourChartContext(now: Date): {
  bucketStartsUtc: Date[];
  queryFromInclusive: Date;
  queryToInclusive: Date;
} {
  const endBucket = utcTruncateToHour(now);
  const bucketStartsUtc = Array.from({ length: 24 }, (_, i) => {
    return new Date(endBucket.getTime() - (23 - i) * MS_HOUR);
  });
  return {
    bucketStartsUtc,
    queryFromInclusive: bucketStartsUtc[0],
    queryToInclusive: new Date(now.getTime()),
  };
}
