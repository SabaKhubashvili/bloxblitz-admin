import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

const DICE_ANALYTICS_RANGES = ['24h', '7d', '30d'] as const;

export class DiceAnalyticsDetailQueryDto {
  @IsOptional()
  @IsIn(DICE_ANALYTICS_RANGES)
  range?: RollingAnalyticsPreset;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  player?: string;
}

export class DiceScatterAnalyticsQueryDto extends DiceAnalyticsDetailQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  minBet?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  maxBet?: number;
}
