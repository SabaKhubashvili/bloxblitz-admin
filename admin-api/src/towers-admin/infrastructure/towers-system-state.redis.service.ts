import { Injectable, Logger } from '@nestjs/common';
import {
  TowersSystemMode,
  TowersSystemStatePayload,
  TOWERS_SYSTEM_STATE_REDIS_KEY,
  parseTowersSystemState,
} from '../domain/towers-system-state';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class TowersSystemStateRedisService {
  private readonly log = new Logger(TowersSystemStateRedisService.name);
  private readonly key = TOWERS_SYSTEM_STATE_REDIS_KEY;

  constructor(private readonly redisManager: RedisService) {}

  async read(): Promise<TowersSystemStatePayload> {
    const client = this.redisManager.getClient();
    if (!client) {
      this.log.warn('Redis unavailable; Towers system state default ACTIVE');
      return { mode: TowersSystemMode.ACTIVE };
    }
    try {
      const raw = await client.get(this.key);
      if (raw == null || raw.length === 0) {
        return { mode: TowersSystemMode.ACTIVE };
      }
      const parsed = parseTowersSystemState(JSON.parse(raw) as unknown);
      return parsed ?? { mode: TowersSystemMode.ACTIVE };
    } catch (e) {
      this.log.warn(
        `towers system state GET failed: ${e instanceof Error ? e.message : e}`,
      );
      return { mode: TowersSystemMode.ACTIVE };
    }
  }

  async write(payload: TowersSystemStatePayload): Promise<TowersSystemStatePayload> {
    const client = this.redisManager.getClient();
    if (!client) {
      throw new Error('Redis unavailable — cannot persist Towers system state');
    }
    await client.set(this.key, JSON.stringify(payload));
    return payload;
  }
}
