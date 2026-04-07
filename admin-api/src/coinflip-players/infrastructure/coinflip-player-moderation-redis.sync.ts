import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service';
import { CoinflipFraudRedisKeys } from '../../coinflip-fraud/infrastructure/coinflip-fraud.redis-keys';

/** Must match ws `CoinflipRedisService.getBannedUsers` document key. */
const COINFLIP_BANNED_USERS_REDIS_KEY = 'coinflip:config:banned_users';

const MITIGATION_TTL_SEC = 15_552_000;

type BanEntry = { username: string; reason: string; until: string };

@Injectable()
export class CoinflipPlayerModerationRedisSync {
  private readonly log = new Logger(CoinflipPlayerModerationRedisSync.name);

  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  async addBan(username: string, reason: string, untilIso: string): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('addBan: Redis unavailable');
      return;
    }
    const raw = await r.get(COINFLIP_BANNED_USERS_REDIS_KEY);
    let list: BanEntry[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
    }
    const idx = list.findIndex(
      (x) => x.username.toLowerCase() === username.toLowerCase(),
    );
    const entry: BanEntry = {
      username,
      reason: reason.slice(0, 500),
      until: untilIso,
    };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    await r.set(COINFLIP_BANNED_USERS_REDIS_KEY, JSON.stringify(list));
  }

  async removeBan(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    const raw = await r.get(COINFLIP_BANNED_USERS_REDIS_KEY);
    if (!raw) return;
    let list: BanEntry[] = [];
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
    } catch {
      return;
    }
    const next = list.filter(
      (x) => x.username.toLowerCase() !== username.toLowerCase(),
    );
    if (next.length === list.length) return;
    await r.set(COINFLIP_BANNED_USERS_REDIS_KEY, JSON.stringify(next));
  }

  /**
   * Soft max bet as cents (matches WS `CoinflipFraudMitigationReader` / admin fraud tooling).
   * Pass null to remove the field.
   */
  async setMaxBetCents(username: string, cents: number | null): Promise<void> {
    const r = this.client();
    if (!r) return;
    const key = CoinflipFraudRedisKeys.mitigation(username);
    if (cents == null) {
      await r.hdel(key, 'maxBetCents');
      return;
    }
    const pipe = r.pipeline();
    pipe.hset(key, 'maxBetCents', String(Math.max(0, Math.floor(cents))));
    pipe.expire(key, MITIGATION_TTL_SEC);
    await pipe.exec();
  }

  async setMaxGamesPerHourField(
    username: string,
    value: number | null,
  ): Promise<void> {
    const r = this.client();
    if (!r) return;
    const key = CoinflipFraudRedisKeys.mitigation(username);
    if (value == null) {
      await r.hdel(key, 'maxGamesPerHour');
      return;
    }
    const pipe = r.pipeline();
    pipe.hset(key, 'maxGamesPerHour', String(Math.max(0, Math.floor(value))));
    pipe.expire(key, MITIGATION_TTL_SEC);
    await pipe.exec();
  }

  /** Clears mitigation fields written by coinflip player limits (not a full mitigation wipe). */
  async clearLimitFields(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    await r.hdel(
      CoinflipFraudRedisKeys.mitigation(username),
      'maxBetCents',
      'maxGamesPerHour',
    );
  }
}
