import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { RouletteRestriction } from '../domain/roulette-restriction.entity';
import {
  ROULETTE_RESTRICTION_CACHE,
  type RouletteRestrictionCachePort,
} from './ports/roulette-restriction.cache.port';
import {
  ROULETTE_RESTRICTION_REPOSITORY,
  type RouletteRestrictionRepositoryPort,
} from './ports/roulette-restriction.repository.port';
import { syncRestrictionCacheAfterUpsert } from './sync-restriction-cache.after-upsert';

@Injectable()
export class BanPlayerUseCase {
  constructor(
    @Inject(ROULETTE_RESTRICTION_REPOSITORY)
    private readonly repo: RouletteRestrictionRepositoryPort,
    @Inject(ROULETTE_RESTRICTION_CACHE)
    private readonly cache: RouletteRestrictionCachePort,
  ) {}

  async execute(
    username: string,
    banReason: string | null,
  ): Promise<RouletteRestriction> {
    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    const existing = await this.repo.findByUsername(canonical);
    const saved = await this.repo.upsert({
      username: canonical,
      isBanned: true,
      banReason,
      maxWagerAmount: existing?.maxWagerAmount ?? null,
      timeframe: existing?.timeframe ?? null,
    });

    await syncRestrictionCacheAfterUpsert(this.cache, saved);
    return RouletteRestriction.fromSnapshot(saved);
  }
}
