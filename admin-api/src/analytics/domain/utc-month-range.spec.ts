import {
  enumerateUtcYearMonths,
  utcMonthRangeForLastNMonths,
} from './utc-month-range';

describe('utc-month-range', () => {
  it('utcMonthRangeForLastNMonths clamps and anchors to UTC month start', () => {
    const now = new Date(Date.UTC(2025, 2, 15, 12, 0, 0));
    const { from, to } = utcMonthRangeForLastNMonths(now, 3);
    expect(from.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(to.getTime()).toBe(now.getTime());
  });

  it('enumerateUtcYearMonths lists YYYY-MM chronologically', () => {
    const from = new Date(Date.UTC(2024, 10, 1));
    const to = new Date(Date.UTC(2025, 0, 10));
    expect(enumerateUtcYearMonths(from, to)).toEqual([
      '2024-11',
      '2024-12',
      '2025-01',
    ]);
  });
});
