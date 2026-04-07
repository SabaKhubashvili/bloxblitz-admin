import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  DicePlayersModerationFilter,
  DicePlayersSortField,
} from '../../domain/dice-analytics.repository.port';

const MODERATION_STATUS_VALUES: DicePlayersModerationFilter[] = [
  'active',
  'limited',
  'banned',
];

const SORT_VALUES: DicePlayersSortField[] = [
  'rolls',
  'wagered',
  'winRate',
  'profitLoss',
  'username',
  'risk',
  'status',
];

const ORDER_VALUES = ['asc', 'desc'] as const;

export class DicePlayersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  username?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(SORT_VALUES)
  sort?: DicePlayersSortField;

  @IsOptional()
  @IsIn(ORDER_VALUES)
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsIn(MODERATION_STATUS_VALUES)
  moderationStatus?: DicePlayersModerationFilter;
}
