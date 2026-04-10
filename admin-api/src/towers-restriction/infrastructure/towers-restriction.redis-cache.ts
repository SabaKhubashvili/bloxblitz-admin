import { Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { RedisService } from '../../redis/redis.service';
import type { TowersRestrictionCachePort } from '../application/ports/towers-restriction.cache.port';
import type { TowersRestrictionSnapshot } from '../domain/towers-restriction.entity';
import type { TowersWagerWindow } from '../domain/towers-wager-window';
import {
  TOWERS_RESTRICTIONS_HASH,
  towersRestrictionsHashField,
  towersWagerKey,
} from './towers-restriction.redis-keys';

@Injectable()
export class TowersRestrictionRedisCache implements TowersRestrictionCachePort {
  private readonly log = new Logger(TowersRestrictionRedisCache.name);

  constructor(private readonly redis: RedisService) {}

  private client(): Redis | null {
    return this.redis.getClient();
  }

  async setRestriction(snapshot: TowersRestrictionSnapshot): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('Redis unavailable; Towers restriction not cached');
      return;
    }
    const field = towersRestrictionsHashField(snapshot.username);
    const body = JSON.stringify({
      banned: snapshot.banned,
      banReason: snapshot.banReason,
      dailyWagerLimit: snapshot.dailyWagerLimit,
      weeklyWagerLimit: snapshot.weeklyWagerLimit,
      monthlyWagerLimit: snapshot.monthlyWagerLimit,
      limitReason: snapshot.limitReason,
    });
    await r.hset(TOWERS_RESTRICTIONS_HASH, field, body);
  }

  async deleteRestriction(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    await r.hdel(TOWERS_RESTRICTIONS_HASH, towersRestrictionsHashField(username));
  }

  async deleteWagerKeys(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    const windows: TowersWagerWindow[] = ['DAILY', 'WEEKLY', 'MONTHLY'];
    const keys = windows.map((w) => towersWagerKey(username, w));
    if (keys.length) await r.del(...keys);
  }
}
