/**
 * Half-open range [from, to) covering `monthCount` UTC calendar months ending at the current UTC month (inclusive of partial current month).
 */
export function utcMonthRangeForLastNMonths(
  now: Date,
  monthCount: number,
): { from: Date; to: Date } {
  const clamped = Math.max(1, Math.min(monthCount, 60));
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m - (clamped - 1), 1, 0, 0, 0, 0));
  const to = new Date(now.getTime());
  return { from, to };
}

/**
 * Enumerate YYYY-MM strings from from (inclusive) to to (inclusive), UTC month starts.
 */
export function enumerateUtcYearMonths(from: Date, to: Date): string[] {
  const out: string[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth();
  const endY = to.getUTCFullYear();
  const endM = to.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}
