import type { WageringTimeRangePreset } from './wagering-time-range';

export type StatisticsChartCriteria = {
  preset?: WageringTimeRangePreset;
  startDate?: string;
  endDate?: string;
  gameType?: string;
  diceRollMode?: string;
};
