import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Redis key shapes must stay aligned with BloxBlitz_Amp `RedisKeys` / db-service.
 *
 * Best-effort: Redis outages must not fail admin writes.
 */
const userBalance = (username: string) => `user:balance:${username}`;
const userProfile = (username: string) => `user:profile:${username}`;
const userPublicProfile = (username: string) => `user:publicProfile:${username}`;
const cacheUserprofile = (username: string) => `cache:user:profile:${username}`;
const cacheUserPublicProfile = (username: string) =>
  `cache:user:publicProfile:${username}`;
const levelingUserInfo = (username: string) => `leveling:userInfo:${username}`;
const levelingUserRank = (username: string) => `leveling:userRank:${username}`;
const rewardCasesUserState = (username: string) =>
  `cache:reward-cases:user-state:${username}`;
const userRakeback = (username: string) => `user:rakeback:${username}`;

export type AdminGameUserCacheTouches = {
  balance: boolean;
  profileOrProgress: boolean;
  wagerStats: boolean;
};

@Injectable()
export class AdminGameUserCacheInvalidator {
  private readonly logger = new Logger(AdminGameUserCacheInvalidator.name);

  constructor(private readonly redis: RedisService) {}

  collectKeys(username: string, touches: AdminGameUserCacheTouches): string[] {
    const keys: string[] = [];
    if (touches.balance) {
      keys.push(userBalance(username));
    }
    if (touches.profileOrProgress) {
      keys.push(
        userProfile(username),
        userPublicProfile(username),
        cacheUserprofile(username),
        cacheUserPublicProfile(username),
        levelingUserInfo(username),
        levelingUserRank(username),
        rewardCasesUserState(username),
      );
    }
    if (touches.wagerStats) {
      keys.push(userRakeback(username));
    }
    return keys;
  }

  /** Deletes live / read-through cache entries the game API and Amp stack use for this user. */
  async invalidate(username: string, touches: AdminGameUserCacheTouches): Promise<void> {
    const keys = this.collectKeys(username, touches);
    if (keys.length === 0) return;

    const client = this.redis.getClient();
    if (!client) return;

    try {
      await client.del(...keys);
      this.logger.debug(
        `Admin game-user cache invalidated for ${username} (${keys.length} key(s))`,
      );
    } catch (err) {
      this.logger.warn(
        `Admin game-user cache invalidation failed for ${username}`,
        err,
      );
    }
  }
}
