import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const SIDE_VALUES = ['all', 'over', 'under'] as const;

export type DiceRecentGamesSideQuery = (typeof SIDE_VALUES)[number];

export class DiceRecentGamesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  player?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  minBet?: number;

  @IsOptional()
  @IsIn(SIDE_VALUES)
  side?: DiceRecentGamesSideQuery;
}
