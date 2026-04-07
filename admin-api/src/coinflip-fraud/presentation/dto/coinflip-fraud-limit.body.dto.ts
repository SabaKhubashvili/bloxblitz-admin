import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CoinflipFraudLimitBodyDto {
  /** Basis points of platform max bet (e.g. 4000 = 40%). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(10000)
  maxBetScaleBps?: number;

  /** Hard cap in cents (optional). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxBetCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120_000)
  matchmakingDelayMs?: number;
}
