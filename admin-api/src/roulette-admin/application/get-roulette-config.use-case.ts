import { Injectable } from '@nestjs/common';
import { RouletteConfigRedisRepository } from '../infrastructure/roulette-config.redis.repository';
import type { RouletteConfigResponseDto } from '../presentation/dto/roulette-config.response.dto';

@Injectable()
export class GetRouletteConfigUseCase {
  constructor(private readonly repo: RouletteConfigRedisRepository) {}

  async execute(): Promise<RouletteConfigResponseDto> {
    const c = await this.repo.loadResolvedConfig();
    return { ...c };
  }
}
