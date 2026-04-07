import { IsIn, IsOptional } from 'class-validator';
import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

const DICE_ANALYTICS_RANGES = ['24h', '7d', '30d'] as const;

export type DiceAnalyticsRangeQuery = (typeof DICE_ANALYTICS_RANGES)[number];

export class DiceAnalyticsQueryDto {
  @IsOptional()
  @IsIn(DICE_ANALYTICS_RANGES)
  range?: RollingAnalyticsPreset;
}
