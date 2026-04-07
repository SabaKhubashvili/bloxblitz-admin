import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from '../../redis/redis.service';

/**
 * Global Crash runtime flags in Redis (no DB). Game services should read:
 * - `bb:crash:runtime:paused` — if set to "1", round engine should stay paused.
 * - `bb:crash:runtime:bets_disabled` — if set to "1", do not accept new bets.
 */
export const CRASH_RUNTIME_REDIS_KEY_PAUSED = 'bb:crash:runtime:paused';
export const CRASH_RUNTIME_REDIS_KEY_BETS_DISABLED =
  'bb:crash:runtime:bets_disabled';

const FLAG_ON = '1';

@Injectable()
export class CrashRuntimeRedisService {
  constructor(private readonly redisManager: RedisService) {}

  private redis(): Redis {
    const client = this.redisManager.getClient();
    if (!client) {
      throw new ServiceUnavailableException(
        'Crash runtime controls require a working Redis connection (REDIS_URL or REDIS_HOST).',
      );
    }
    return client;
  }

  async getState(): Promise<{ paused: boolean; betsDisabled: boolean }> {
    const r = this.redis();
    const [pausedRaw, betsRaw] = await r.mget(
      CRASH_RUNTIME_REDIS_KEY_PAUSED,
      CRASH_RUNTIME_REDIS_KEY_BETS_DISABLED,
    );
    return {
      paused: pausedRaw === FLAG_ON,
      betsDisabled: betsRaw === FLAG_ON,
    };
  }

  async setPaused(paused: boolean): Promise<void> {
    const r = this.redis();
    if (paused) await r.set(CRASH_RUNTIME_REDIS_KEY_PAUSED, FLAG_ON);
    else await r.del(CRASH_RUNTIME_REDIS_KEY_PAUSED);
  }

  async setBetsDisabled(disabled: boolean): Promise<void> {
    const r = this.redis();
    if (disabled) await r.set(CRASH_RUNTIME_REDIS_KEY_BETS_DISABLED, FLAG_ON);
    else await r.del(CRASH_RUNTIME_REDIS_KEY_BETS_DISABLED);
  }
}
