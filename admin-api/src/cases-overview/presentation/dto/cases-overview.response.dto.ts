import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';
import type { CasesOverviewAggregate } from '../../domain/cases-overview.repository';

export class CasesOverviewResponseDto {
  range: RollingAnalyticsPreset;
  totalCases: number;
  activeCases: number;
  totalOpened: number;
  totalRevenue: number;

  static fromAggregate(
    range: RollingAnalyticsPreset,
    row: CasesOverviewAggregate,
  ): CasesOverviewResponseDto {
    const o = new CasesOverviewResponseDto();
    o.range = range;
    o.totalCases = row.totalCases;
    o.activeCases = row.activeCases;
    o.totalOpened = row.totalOpened;
    o.totalRevenue = row.totalRevenue;
    return o;
  }
}
