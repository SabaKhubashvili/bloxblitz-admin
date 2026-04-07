import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import type { CoinflipEconomyConfig } from '../../domain/coinflip-economy-config';

export class UpdateCoinflipEconomyConfigBodyDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  minBet?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(Number.EPSILON)
  maxBet?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  platformFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxActiveGames?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxGamesPerUser?: number;
}

export function coinflipEconomyBodyToPatch(
  dto: UpdateCoinflipEconomyConfigBodyDto,
): Partial<CoinflipEconomyConfig> {
  const patch: Partial<CoinflipEconomyConfig> = {};
  if (dto.minBet !== undefined) {
    patch.minBet = dto.minBet;
  }
  if (dto.maxBet !== undefined) {
    patch.maxBet = dto.maxBet;
  }
  if (dto.platformFee !== undefined) {
    patch.platformFee = dto.platformFee;
  }
  if (dto.maxActiveGames !== undefined) {
    patch.maxActiveGames = dto.maxActiveGames;
  }
  if (dto.maxGamesPerUser !== undefined) {
    patch.maxGamesPerUser = dto.maxGamesPerUser;
  }
  return patch;
}
