import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service';

/** Global kill switch — same key as game API (`dice:betting:disabled`). */
export const DICE_BETTING_DISABLED_KEY = 'dice:betting:disabled';

/** `1` = disabled, `0` = enabled. */
@Injectable()
export class DiceBettingControlRedisService {
  private readonly log = new Logger(DiceBettingControlRedisService.name);

  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  async getBettingDisabled(): Promise<boolean> {
    const r = this.client();
    if (!r) {
      this.log.warn('getBettingDisabled: Redis unavailable — treat as enabled');
      return false;
    }
    try {
      let raw = await r.get(DICE_BETTING_DISABLED_KEY);
      if (raw === null) {
        await r.set(DICE_BETTING_DISABLED_KEY, '0');
        raw = '0';
      }
      return raw === '1';
    } catch (e) {
      this.log.warn(
        `getBettingDisabled failed: ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  async setBettingDisabled(disabled: boolean): Promise<void> {
    const r = this.client();
    if (!r) {
      throw new Error('Redis unavailable — cannot change dice betting flag');
    }
    await r.set(DICE_BETTING_DISABLED_KEY, disabled ? '1' : '0');
  }
}
