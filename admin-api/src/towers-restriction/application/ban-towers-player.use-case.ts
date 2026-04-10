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
export class BanTowersPlayerUseCase {
  constructor(
    @Inject(TOWERS_RESTRICTION_REPOSITORY)
    private readonly repo: TowersRestrictionRepositoryPort,
    @Inject(TOWERS_RESTRICTION_CACHE)
    private readonly cache: TowersRestrictionCachePort,
  ) {}

  async execute(
    username: string,
    banReason: string | null,
  ): Promise<TowersPlayerRestriction> {
    const canonical = await this.repo.resolveUsername(username);
    if (!canonical) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    const existing = await this.repo.findByUsername(canonical);
    const saved = await this.repo.upsert({
      username: canonical,
      isBanned: true,
      banReason,
      dailyWagerLimit: existing?.dailyWagerLimit ?? null,
      weeklyWagerLimit: existing?.weeklyWagerLimit ?? null,
      monthlyWagerLimit: existing?.monthlyWagerLimit ?? null,
      limitReason: existing?.limitReason ?? null,
    });

    await syncTowersRestrictionCacheAfterUpsert(this.cache, saved);
    return TowersPlayerRestriction.fromSnapshot(saved);
  }
}
