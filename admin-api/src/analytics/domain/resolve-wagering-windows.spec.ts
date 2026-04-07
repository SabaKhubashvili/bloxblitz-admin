import { boundsForPreset, listWindowBounds } from './resolve-wagering-windows';
import { WageringTimeRangePreset } from './wagering-time-range';

describe('resolve-wagering-windows', () => {
  it('boundsForPreset uses 24h rolling window', () => {
    const now = new Date('2025-01-15T12:00:00.000Z');
    const { from, to, key } = boundsForPreset(
      WageringTimeRangePreset.LAST_24_HOURS,
      now,
    );
    expect(key).toBe('last24Hours');
    expect(to.toISOString()).toBe(now.toISOString());
    expect(from.getTime()).toBe(now.getTime() - 24 * 60 * 60 * 1000);
  });

  it('listWindowBounds returns four keys by default', () => {
    const now = new Date('2025-01-15T12:00:00.000Z');
    const list = listWindowBounds(now);
    expect(list.map((b) => b.key)).toEqual([
      'last24Hours',
      'last7Days',
      'last30Days',
      'last1Year',
    ]);
  });
});
