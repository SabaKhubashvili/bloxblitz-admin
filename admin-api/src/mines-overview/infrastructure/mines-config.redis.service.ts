import { Injectable, Logger } from '@nestjs/common';
import {
  MINES_CONFIG_DEFAULTS,
  MINES_CONFIG_REDIS_KEY,
  type MinesConfigPayload,
} from '../domain/mines-config.defaults';
import { parseMinesConfigFromUnknown } from '../domain/mines-config.validation';
import { RedisService } from '../../redis/redis.service';

/** Last successful POST (or parsed Redis) — used when Redis is down or key missing after POST. */
let minesConfigMemory: MinesConfigPayload | null = null;

@Injectable()
export class MinesConfigRedisService {
  private readonly log = new Logger(MinesConfigRedisService.name);
  private readonly key = MINES_CONFIG_REDIS_KEY;

  constructor(private readonly redisManager: RedisService) {}

  async read(): Promise<MinesConfigPayload> {
    const client = this.redisManager.getClient();
    if (client) {
      try {
        const raw = await client.get(this.key);
        if (raw !== null && raw !== undefined && raw.length > 0) {
          const parsed = this.parseStored(raw);
          if (parsed) {
            minesConfigMemory = { ...parsed };
            return parsed;
          }
        }
      } catch (e) {
        this.log.warn(
          `mines config Redis GET failed: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    if (minesConfigMemory) {
      return { ...minesConfigMemory };
    }

    return { ...MINES_CONFIG_DEFAULTS };
  }

  async write(payload: MinesConfigPayload): Promise<MinesConfigPayload> {
    minesConfigMemory = { ...payload };
    const client = this.redisManager.getClient();
    if (!client) {
      this.log.warn('Redis unavailable; mines config stored in memory only.');
      return minesConfigMemory;
    }
    try {
      await client.set(this.key, JSON.stringify(payload));
    } catch (e) {
      this.log.warn(
        `mines config Redis SET failed (in-memory copy kept): ${e instanceof Error ? e.message : e}`,
      );
    }
    return minesConfigMemory;
  }

  private parseStored(raw: string): MinesConfigPayload | null {
    try {
      const o = JSON.parse(raw) as unknown;
      return parseMinesConfigFromUnknown(o);
    } catch {
      return null;
    }
  }
}
