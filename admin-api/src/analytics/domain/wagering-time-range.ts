/** Requested preset for analytics windows. */
export enum WageringTimeRangePreset {
  LAST_24_HOURS = '24h',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_1_YEAR = '1y',
}

export type WageringWindowKey =
  | 'last24Hours'
  | 'last7Days'
  | 'last30Days'
  | 'last1Year';

export const WAGERING_WINDOW_ORDER: WageringWindowKey[] = [
  'last24Hours',
  'last7Days',
  'last30Days',
  'last1Year',
];

export const PRESET_TO_WINDOW: Record<WageringTimeRangePreset, WageringWindowKey> =
  {
    [WageringTimeRangePreset.LAST_24_HOURS]: 'last24Hours',
    [WageringTimeRangePreset.LAST_7_DAYS]: 'last7Days',
    [WageringTimeRangePreset.LAST_30_DAYS]: 'last30Days',
    [WageringTimeRangePreset.LAST_1_YEAR]: 'last1Year',
  };
