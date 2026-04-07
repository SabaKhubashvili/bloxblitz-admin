import { Injectable, Logger } from '@nestjs/common';
import {
  MinesSystemMode,
  MinesSystemStatePayload,
  MINES_SYSTEM_STATE_REDIS_KEY,
  parseMinesSystemState,
} from '../domain/mines-system-state';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class MinesSystemStateRedisService {
  private readonly log = new Logger(MinesSystemStateRedisService.name);
  private readonly key = MINES_SYSTEM_STATE_REDIS_KEY;

  constructor(private readonly redisManager: RedisService) {}

  async read(): Promise<MinesSystemStatePayload> {
    const client = this.redisManager.getClient();
    if (!client) {
      this.log.warn('Redis unavailable; Mines system state default ACTIVE');
      return { mode: MinesSystemMode.ACTIVE };
    }
    try {
      const raw = await client.get(this.key);
      if (raw == null || raw.length === 0) {
        return { mode: MinesSystemMode.ACTIVE };
      }
      const parsed = parseMinesSystemState(JSON.parse(raw) as unknown);
      return parsed ?? { mode: MinesSystemMode.ACTIVE };
    } catch (e) {
      this.log.warn(
        `mines system state GET failed: ${e instanceof Error ? e.message : e}`,
      );
      return { mode: MinesSystemMode.ACTIVE };
    }
  }

  async write(payload: MinesSystemStatePayload): Promise<MinesSystemStatePayload> {
    const client = this.redisManager.getClient();
    if (!client) {
      throw new Error('Redis unavailable — cannot persist Mines system state');
    }
    await client.set(this.key, JSON.stringify(payload));
    return payload;
  }
}
