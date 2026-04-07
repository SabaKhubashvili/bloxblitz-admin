import { rollingWindowBounds } from '../../common/rolling-analytics-window';
import {
  PRESET_TO_WINDOW,
  WAGERING_WINDOW_ORDER,
  WageringTimeRangePreset,
  type WageringWindowKey,
} from './wagering-time-range';
import type { WageringStatsWindowBounds } from './wagering-stats.criteria';

/**
 * Returns [from, to) where `to` is exclusive (now / snapshot instant).
 */
export function boundsForPreset(
  preset: WageringTimeRangePreset,
  now: Date,
): { key: WageringWindowKey; from: Date; to: Date } {
  if (preset === WageringTimeRangePreset.LAST_1_YEAR) {
    const to = new Date(now.getTime());
    const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);
    return { key: PRESET_TO_WINDOW[preset], from, to };
  }
  const { from, to } = rollingWindowBounds(preset, now);
  return { key: PRESET_TO_WINDOW[preset], from, to };
}

export function listWindowBounds(
  now: Date,
  presets?: WageringTimeRangePreset[],
): WageringStatsWindowBounds[] {
  const list =
    presets ??
    [
      WageringTimeRangePreset.LAST_24_HOURS,
      WageringTimeRangePreset.LAST_7_DAYS,
      WageringTimeRangePreset.LAST_30_DAYS,
      WageringTimeRangePreset.LAST_1_YEAR,
    ];
  return list.map((preset) => {
    const b = boundsForPreset(preset, now);
    return { key: b.key, from: b.from, to: b.to };
  });
}

/**
 * Stable ordering for multi-window responses.
 */
export function sortWindowKeys(keys: WageringWindowKey[]): WageringWindowKey[] {
  const rank = new Map(
    WAGERING_WINDOW_ORDER.map((k, i) => [k, i] as const),
  );
  return [...keys].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}
