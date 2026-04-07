import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class LimitCrashPlayerBodyDto {
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999.99)
  maxBetAmount?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(86_400)
  minSecondsBetweenBets?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
