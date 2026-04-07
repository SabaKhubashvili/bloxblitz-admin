import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum GlobalUserModerationActionDto {
  BAN = 'BAN',
  UNBAN = 'UNBAN',
  LIMIT = 'LIMIT',
  UNLIMIT = 'UNLIMIT',
}

export class GlobalUserModerationBodyDto {
  @IsEnum(GlobalUserModerationActionDto)
  action!: GlobalUserModerationActionDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Applied to dice / mines / crash max stake and coinflip max wager when action is LIMIT. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(9_999_999)
  maxBetAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10_000)
  maxGamesPerHour?: number;
}
