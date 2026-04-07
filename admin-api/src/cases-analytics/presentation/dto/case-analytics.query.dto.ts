import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

export class CaseAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['24h', '7d', '30d'])
  range?: RollingAnalyticsPreset;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
