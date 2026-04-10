import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TowersPlayerRestriction } from '../domain/towers-restriction.entity';
import {
  TOWERS_RESTRICTION_CACHE,
  type TowersRestrictionCachePort,
} from './ports/towers-restriction.cache.port';
import {
  TOWERS_RESTRICTION_REPOSITORY,
  type TowersRestrictionRepositoryPort,
} from './ports/towers-restriction.repository.port';
import { syncTowersRestrictionCacheAfterUpsert } from './sync-towers-restriction-cache.after-upsert';

@Injectable()
export class UnbanTowersPlayerUseCase {
  constructor(
    @Inject(TOWERS_RESTRICTION_REPOSITORY)
    private readonly repo: TowersRestrictionRepositoryPort,
    @Inject(TOWERS_RESTRICTION_CACHE)
    private readonly cache: TowersRestrictionCachePort,
  ) {}

  async execute(username: string): Promise<TowersPlayerRestriction | null> {
    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    const existing = await this.repo.findByUsername(canonical);
    if (!existing) {
      return null;
    }

    const saved = await this.repo.upsert({
      username: existing.username,
      isBanned: false,
      banReason: null,
      dailyWagerLimit: existing.dailyWagerLimit,
      weeklyWagerLimit: existing.weeklyWagerLimit,
      monthlyWagerLimit: existing.monthlyWagerLimit,
      limitReason: existing.limitReason,
    });

    await syncTowersRestrictionCacheAfterUpsert(this.cache, saved);
    return TowersPlayerRestriction.fromSnapshot(saved);
  }
}
