import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

export type CaseAnalyticsOverviewDto = {
  totalOpened: number;
  revenue: number;
  avgRtp: number;
};

export type CaseMostWonItemDto = {
  name: string;
  dropCount: number;
};

export type CaseOpenRatePointDto = {
  date: string;
  openCount: number;
};

export type CaseDropDistributionItemDto = {
  itemName: string;
  dropCount: number;
  percentage: number;
};

export type CaseAnalyticsResponseDto = {
  range: RollingAnalyticsPreset;
  caseId: string;
  overview: CaseAnalyticsOverviewDto;
  mostWonItems: CaseMostWonItemDto[];
  openRateOverTime: CaseOpenRatePointDto[];
  itemDropDistribution: CaseDropDistributionItemDto[];
};
