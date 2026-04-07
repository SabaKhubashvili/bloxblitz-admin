import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MinesPlayerControlStatus } from '@prisma/client';

export class MinesModerationUpsertBodyDto {
  @IsEnum(MinesPlayerControlStatus)
  status!: MinesPlayerControlStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999_999_999)
  maxBetAmount?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  maxGamesPerHour?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
