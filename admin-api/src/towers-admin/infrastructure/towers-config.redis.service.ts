import { Injectable, Logger } from '@nestjs/common';
import {
  TOWERS_CONFIG_DEFAULTS,
  TOWERS_CONFIG_REDIS_KEY,
  type TowersConfigPayload,
} from '../domain/towers-config.defaults';
import { parseTowersConfigFromUnknown } from '../domain/towers-config.validation';
import { RedisService } from '../../redis/redis.service';

let towersConfigMemory: TowersConfigPayload | null = null;

@Injectable()
export class TowersConfigRedisService {
  private readonly log = new Logger(TowersConfigRedisService.name);
  private readonly key = TOWERS_CONFIG_REDIS_KEY;

  constructor(private readonly redisManager: RedisService) {}

  async read(): Promise<TowersConfigPayload> {
    const client = this.redisManager.getClient();
    if (client) {
      try {
        const raw = await client.get(this.key);
        if (raw !== null && raw !== undefined && raw.length > 0) {
          const parsed = this.parseStored(raw);
          if (parsed) {
            towersConfigMemory = { ...parsed };
            return parsed;
          }
        }
      } catch (e) {
        this.log.warn(
          `towers config Redis GET failed: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    if (towersConfigMemory) {
      return { ...towersConfigMemory };
    }

    return { ...TOWERS_CONFIG_DEFAULTS };
  }

  async write(payload: TowersConfigPayload): Promise<TowersConfigPayload> {
    towersConfigMemory = { ...payload };
    const client = this.redisManager.getClient();
    if (!client) {
      this.log.warn('Redis unavailable; towers config stored in memory only.');
      return towersConfigMemory;
    }
    try {
      await client.set(this.key, JSON.stringify(payload));
    } catch (e) {
      this.log.warn(
        `towers config Redis SET failed (in-memory copy kept): ${e instanceof Error ? e.message : e}`,
      );
    }
    return towersConfigMemory;
  }

  private parseStored(raw: string): TowersConfigPayload | null {
    try {
      const o = JSON.parse(raw) as unknown;
      return parseTowersConfigFromUnknown(o);
    } catch {
      return null;
    }
  }
}
