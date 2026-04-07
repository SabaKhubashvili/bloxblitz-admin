import { IsIn } from 'class-validator';
import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

export class CrashStatisticsOverviewQueryDto {
  @IsIn(['24h', '7d', '30d'])
  range: RollingAnalyticsPreset;
}
