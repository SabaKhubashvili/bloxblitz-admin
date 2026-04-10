import { BadRequestException, Injectable } from '@nestjs/common';
import {
  cloneRouletteAdminConfig,
  type RouletteAdminConfig,
} from '../domain/roulette-config.defaults';
import { validateRouletteAdminConfig } from '../domain/roulette-config.validation';
import { RouletteConfigRedisRepository } from '../infrastructure/roulette-config.redis.repository';
import type { RouletteConfigResponseDto } from '../presentation/dto/roulette-config.response.dto';
import type { RouletteConfigUpdateDto } from '../presentation/dto/roulette-config.update.dto';

@Injectable()
export class UpdateRouletteConfigUseCase {
  constructor(private readonly repo: RouletteConfigRedisRepository) {}

  async execute(
    body: RouletteConfigUpdateDto,
  ): Promise<RouletteConfigResponseDto> {
    const current = await this.repo.loadResolvedConfig();
    const next: RouletteAdminConfig = cloneRouletteAdminConfig(current);

    if (body.minBet !== undefined) next.minBet = body.minBet;
    if (body.maxBet !== undefined) next.maxBet = body.maxBet;
    if (body.gameEnabled !== undefined) next.gameEnabled = body.gameEnabled;
    if (body.bettingEnabled !== undefined)
      next.bettingEnabled = body.bettingEnabled;

    if (next.minBet >= next.maxBet) {
      throw new BadRequestException('minBet must be less than maxBet.');
    }
    if (!validateRouletteAdminConfig(next)) {
      throw new BadRequestException('Invalid roulette configuration.');
    }

    await this.repo.saveFull(next);
    return { ...next };
  }
}
