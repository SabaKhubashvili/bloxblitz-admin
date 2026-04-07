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

/** Partial updates: set a field to `null` in JSON to clear it. */
export class LimitCoinflipPlayerBodyDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  maxWagerAmount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
