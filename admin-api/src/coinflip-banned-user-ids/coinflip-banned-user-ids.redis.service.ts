import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CoinflipPlayerControlStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { COINFLIP_BANNED_USERNAMES_REDIS_KEY } from './coinflip-banned-user-ids.constants';

/** Must match ws legacy JSON ban list key. */
const COINFLIP_BANNED_USERS_JSON_KEY = 'coinflip:config:banned_users';

@Injectable()
export class CoinflipBannedUserIdsRedisService {
  private readonly log = new Logger(CoinflipBannedUserIdsRedisService.name);

  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  async addBannedUsername(username: string): Promise<void> {
    const u = username.trim();
    if (!u) return;
    const r = this.client();
    if (!r) {
      this.log.warn('addBannedUsername: Redis unavailable');
      return;
    }
    await r.sadd(COINFLIP_BANNED_USERNAMES_REDIS_KEY, u);
  }

  async removeBannedUsername(username: string): Promise<void> {
    const u = username.trim();
    if (!u) return;
    const r = this.client();
    if (!r) return;
    await r.srem(COINFLIP_BANNED_USERNAMES_REDIS_KEY, u);
  }

  /**
   * DB is canonical for `CoinflipPlayerControl` bans; also merge still-active
   * legacy JSON bans so WS stays consistent until JSON is retired.
   */
  async rebuildFromPersistence(prisma: PrismaService): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('rebuildFromPersistence: Redis unavailable — WS ban set not warmed');
      return;
    }

    const controls = await prisma.coinflipPlayerControl.findMany({
      where: { status: CoinflipPlayerControlStatus.BANNED },
      select: { userUsername: true },
    });
    const nameSet = new Set<string>();
    for (const c of controls) nameSet.add(c.userUsername);

    for (const name of await this.loadActiveBannedUsernamesFromLegacyJson(r)) {
      nameSet.add(name);
    }

    const pipeline = r.pipeline();
    pipeline.del(COINFLIP_BANNED_USERNAMES_REDIS_KEY);
    if (nameSet.size > 0) {
      pipeline.sadd(COINFLIP_BANNED_USERNAMES_REDIS_KEY, ...[...nameSet]);
    }
    await pipeline.exec();

    this.log.log(
      `Coinflip banned-username set rebuilt (${nameSet.size} member(s)).`,
    );
  }

  private async loadActiveBannedUsernamesFromLegacyJson(r: Redis): Promise<string[]> {
    const raw = await r.get(COINFLIP_BANNED_USERS_JSON_KEY);
    if (!raw) return [];
    let list: { username: string; until: string }[] = [];
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
    } catch {
      return [];
    }
    const now = Date.now();
    return [
      ...new Set(
        list
          .filter(
            (x) =>
              x &&
              typeof x.username === 'string' &&
              x.username.trim().length > 0 &&
              typeof x.until === 'string' &&
              new Date(x.until).getTime() > now,
          )
          .map((x) => x.username.trim()),
      ),
    ];
  }
}
