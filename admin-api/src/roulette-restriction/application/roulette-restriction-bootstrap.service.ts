import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
export class RouletteRestrictionBootstrapService implements OnModuleInit {
  private readonly log = new Logger(RouletteRestrictionBootstrapService.name);

  constructor(
    @Inject(ROULETTE_RESTRICTION_REPOSITORY)
    private readonly repo: RouletteRestrictionRepositoryPort,
    @Inject(ROULETTE_RESTRICTION_CACHE)
    private readonly cache: RouletteRestrictionCachePort,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const rows = await this.repo.findAll();
      for (const s of rows) {
        await syncRestrictionCacheAfterUpsert(this.cache, s);
      }
      this.log.log(
        `Roulette restrictions: synced ${rows.length} row(s) from DB → Redis.`,
      );
    } catch (e) {
      this.log.warn(
        `Roulette restriction bootstrap skipped: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
