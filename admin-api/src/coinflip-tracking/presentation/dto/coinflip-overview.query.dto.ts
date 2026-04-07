import { IsIn, IsOptional } from 'class-validator';
import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

export class CoinflipOverviewQueryDto {
  @IsOptional()
  @IsIn(['24h', '7d', '30d'], { message: 'range must be 24h, 7d, or 30d' })
  range?: RollingAnalyticsPreset;
}
