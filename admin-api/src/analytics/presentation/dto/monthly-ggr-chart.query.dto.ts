import { DiceRollMode, GameType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class MonthlyGgrChartQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number;

  /**
   * IANA timezone for calendar month buckets. `UTC` when omitted.
   * Zero-filled series (months with no bets) is only applied when this is `UTC`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeZone?: string;

  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;

  @IsOptional()
  @IsEnum(DiceRollMode)
  diceRollMode?: DiceRollMode;
}
