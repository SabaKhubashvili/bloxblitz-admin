import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RouletteConfigUpdateDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  minBet?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  maxBet?: number;

  @IsOptional()
  @IsBoolean()
  gameEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  bettingEnabled?: boolean;
}
