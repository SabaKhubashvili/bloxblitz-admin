import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ROULETTE_RESTRICTION_CACHE,
  type RouletteRestrictionCachePort,
} from './ports/roulette-restriction.cache.port';
import {
  ROULETTE_RESTRICTION_REPOSITORY,
  type RouletteRestrictionRepositoryPort,
} from './ports/roulette-restriction.repository.port';

@Injectable()
export class DeletePlayerRestrictionUseCase {
  constructor(
    @Inject(ROULETTE_RESTRICTION_REPOSITORY)
    private readonly repo: RouletteRestrictionRepositoryPort,
    @Inject(ROULETTE_RESTRICTION_CACHE)
    private readonly cache: RouletteRestrictionCachePort,
  ) {}

  async execute(username: string): Promise<void> {
    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    await this.repo.deleteByUsername(canonical);
    await this.cache.deleteRestriction(canonical);
    await this.cache.deleteWagerKeys(canonical);
  }
}
