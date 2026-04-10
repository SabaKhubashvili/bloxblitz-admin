import { Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { RedisService } from '../../redis/redis.service';
import type { RouletteRestrictionCachePort } from '../application/ports/roulette-restriction.cache.port';
import type { RouletteRestrictionSnapshot } from '../domain/roulette-restriction.entity';
import type { RestrictionTimeframe } from '../domain/restriction-timeframe';
import { restrictionKey, wagerKey } from './roulette-restriction.redis-keys';

const ADD_WAGER_LUA = `
local key = KEYS[1]
local amount = tonumber(ARGV[1])
local maxTotal = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
if amount == nil or maxTotal == nil or ttl == nil then
  return 'ERR:0'
end
local cur = tonumber(redis.call('GET', key) or '0')
if cur + amount > maxTotal + 0.0001 then
  return 'ERR:' .. tostring(cur)
end
if redis.call('EXISTS', key) == 0 then
  redis.call('SET', key, tostring(amount), 'EX', ttl)
else
  redis.call('INCRBYFLOAT', key, amount)
end
return 'OK:' .. redis.call('GET', key)
`;

@Injectable()
export class RouletteRestrictionRedisCache implements RouletteRestrictionCachePort {
  private readonly log = new Logger(RouletteRestrictionRedisCache.name);

  constructor(private readonly redis: RedisService) {}

  private client(): Redis | null {
    return this.redis.getClient();
  }

  async getRestriction(username: string): Promise<RouletteRestrictionSnapshot | null> {
    const r = this.client();
    if (!r) return null;
    const key = restrictionKey(username);
    const raw = await r.get(key);
    if (raw == null || raw === '') return null;
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      const canonical = key.slice('roulette:restriction:'.length);
      return {
        username: canonical,
        banned: Boolean(o.banned),
        banReason:
          typeof o.banReason === 'string'
            ? o.banReason
            : o.banReason === null
              ? null
              : null,
        maxWagerAmount:
          typeof o.maxWagerAmount === 'number' ? o.maxWagerAmount : null,
        timeframe:
          o.timeframe === 'HOURLY' ||
          o.timeframe === 'DAILY' ||
          o.timeframe === 'WEEKLY'
            ? o.timeframe
            : null,
      };
    } catch {
      this.log.warn(`Invalid restriction JSON for username=${username}`);
      return null;
    }
  }

  async setRestriction(snapshot: RouletteRestrictionSnapshot): Promise<void> {
    const r = this.client();
    if (!r) {
      this.log.warn('Redis unavailable; restriction not cached');
      return;
    }
    const body = JSON.stringify({
      banned: snapshot.banned,
      banReason: snapshot.banReason,
      maxWagerAmount: snapshot.maxWagerAmount,
      timeframe: snapshot.timeframe,
    });
    await r.set(restrictionKey(snapshot.username), body);
  }

  async deleteRestriction(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    await r.del(restrictionKey(username));
  }

  async deleteWagerKeys(username: string): Promise<void> {
    const r = this.client();
    if (!r) return;
    const tfs: RestrictionTimeframe[] = ['HOURLY', 'DAILY', 'WEEKLY'];
    const keys = tfs.map((tf) => wagerKey(username, tf));
    if (keys.length) await r.del(...keys);
  }

  async addWagerIfWithinMax(
    username: string,
    timeframe: RestrictionTimeframe,
    amount: number,
    maxTotal: number,
    ttlSeconds: number,
  ): Promise<{ ok: boolean; newTotal: number }> {
    const r = this.client();
    if (!r) {
      this.log.warn('Redis unavailable; wager increment skipped (fail open)');
      return { ok: true, newTotal: 0 };
    }
    const key = wagerKey(username, timeframe);
    const res = (await r.eval(
      ADD_WAGER_LUA,
      1,
      key,
      String(amount),
      String(maxTotal),
      String(ttlSeconds),
    )) as string;
    if (res.startsWith('OK:')) {
      const newTotal = parseFloat(res.slice(3));
      return {
        ok: true,
        newTotal: Number.isFinite(newTotal) ? newTotal : 0,
      };
    }
    const cur = parseFloat(res.startsWith('ERR:') ? res.slice(4) : '0');
    return { ok: false, newTotal: Number.isFinite(cur) ? cur : 0 };
  }
}
