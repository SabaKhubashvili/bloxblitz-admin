import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
export class TowersRestrictionBootstrapService implements OnModuleInit {
  private readonly log = new Logger(TowersRestrictionBootstrapService.name);

  constructor(
    @Inject(TOWERS_RESTRICTION_REPOSITORY)
    private readonly repo: TowersRestrictionRepositoryPort,
    @Inject(TOWERS_RESTRICTION_CACHE)
    private readonly cache: TowersRestrictionCachePort,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const rows = await this.repo.findAll();
      for (const s of rows) {
        await syncTowersRestrictionCacheAfterUpsert(this.cache, s);
      }
      this.log.log(
        `Towers restrictions: synced ${rows.length} row(s) from DB → Redis (hash towers:restrictions).`,
      );
    } catch (e) {
      this.log.warn(
        `Towers restriction bootstrap skipped: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
