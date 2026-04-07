import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Public case caches used by BloxBlitz_Amp/api — keys must match
 * `api/src/infrastructure/cache/redis.keys.ts` (`RedisKeys.cache`).
 */
const CASES_LIST_ACTIVE = 'cache:cases:list:active';
const CASES_LIST_FILTER_EPOCH = 'cache:cases:list:flt:epoch';

function caseDetailKey(slug: string): string {
  return `cache:cases:detail:v3:${encodeURIComponent(slug)}`;
}

@Injectable()
export class CaseAmpCacheInvalidationService {
  private readonly log = new Logger(CaseAmpCacheInvalidationService.name);

  constructor(private readonly redisManager: RedisService) {}

  /**
   * Drop detail for this slug and invalidate list + filtered-list epoch (same as Amp
   * `CaseListCacheAdapter.invalidate()`).
   */
  async invalidateAfterCaseMutation(slug: string): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) {
      return;
    }
    const s = slug?.trim();
    if (!s) {
      return;
    }
    try {
      await redis.del(caseDetailKey(s));
      await redis.del(CASES_LIST_ACTIVE);
      await redis.incr(CASES_LIST_FILTER_EPOCH);
    } catch (e) {
      this.log.warn(
        `Case cache invalidation failed slug=${s}: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  /** After bulk status changes: drop all detail keys and list caches. */
  async invalidateAfterBulkCaseMutations(slugs: string[]): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) {
      return;
    }
    try {
      for (const raw of slugs) {
        const s = raw?.trim();
        if (s) {
          await redis.del(caseDetailKey(s));
        }
      }
      await redis.del(CASES_LIST_ACTIVE);
      await redis.incr(CASES_LIST_FILTER_EPOCH);
    } catch (e) {
      this.log.warn(
        `Bulk case cache invalidation failed: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
