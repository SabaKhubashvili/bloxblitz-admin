import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TOWERS_RESTRICTION_CACHE,
  type TowersRestrictionCachePort,
} from './ports/towers-restriction.cache.port';
import {
  TOWERS_RESTRICTION_REPOSITORY,
  type TowersRestrictionRepositoryPort,
} from './ports/towers-restriction.repository.port';

@Injectable()
export class DeleteTowersRestrictionUseCase {
  constructor(
    @Inject(TOWERS_RESTRICTION_REPOSITORY)
    private readonly repo: TowersRestrictionRepositoryPort,
    @Inject(TOWERS_RESTRICTION_CACHE)
    private readonly cache: TowersRestrictionCachePort,
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
