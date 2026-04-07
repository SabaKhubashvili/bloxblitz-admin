import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/** Redis keys must stay in sync with the Amp API's RedisKeys.rewardCases namespace. */
const DEFINITIONS_KEY = 'cache:reward-cases:definitions';
const USER_STATE_PREFIX = 'cache:reward-cases:user-state:';

/**
 * Thin invalidation helper used by admin services.
 *
 * Deletes the same Redis keys that the Amp API populates, so the public API
 * always serves fresh data after an admin mutation.  All operations are
 * best-effort: a Redis outage must never cause an admin write to fail.
 */
@Injectable()
export class RewardCasesCacheInvalidator {
  private readonly logger = new Logger(RewardCasesCacheInvalidator.name);

  constructor(private readonly redis: RedisService) {}

  /** Drop the shared definitions catalog. */
  async invalidateDefinitions(): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    try {
      await client.del(DEFINITIONS_KEY);
      this.logger.debug('[RewardCasesCache] definitions invalidated by admin');
    } catch (err) {
      this.logger.warn(
        '[RewardCasesCache] invalidateDefinitions failed',
        err,
      );
    }
  }

  /** Drop the per-user balance state for a specific user. */
  async invalidateUserState(username: string): Promise<void> {
    const client = this.redis.getClient();
    if (!client) return;
    try {
      await client.del(`${USER_STATE_PREFIX}${username}`);
      this.logger.debug(
        `[RewardCasesCache] user state invalidated by admin for ${username}`,
      );
    } catch (err) {
      this.logger.warn(
        `[RewardCasesCache] invalidateUserState failed for ${username}`,
        err,
      );
    }
  }
}
