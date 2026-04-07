import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

export class PopularCaseDto {
  id: string;
  name: string;
  price: number;
  opens: number;
}

export class CasesPopularResponseDto {
  range: RollingAnalyticsPreset;
  cases: PopularCaseDto[];
}
