import { Injectable, Logger } from '@nestjs/common';
import {
  cloneRouletteAdminConfig,
  DEFAULT_ROULETTE_ADMIN_CONFIG,
  ROULETTE_ADMIN_CONFIG_REDIS_KEY,
  type RouletteAdminConfig,
} from '../domain/roulette-config.defaults';
import {
  hashMissingAnyField,
  rouletteConfigFromRedisHash,
  rouletteConfigToRedisFields,
  validateRouletteAdminConfig,
} from '../domain/roulette-config.validation';
import { RedisService } from '../../redis/redis.service';

let rouletteConfigMemoryFallback: RouletteAdminConfig | null = null;

@Injectable()
export class RouletteConfigRedisRepository {
  private readonly log = new Logger(RouletteConfigRedisRepository.name);
  private readonly key = ROULETTE_ADMIN_CONFIG_REDIS_KEY;

  constructor(private readonly redisManager: RedisService) {}

  async loadResolvedConfig(): Promise<RouletteAdminConfig> {
    const client = this.redisManager.getClient();
    const defaults = cloneRouletteAdminConfig(DEFAULT_ROULETTE_ADMIN_CONFIG);

    if (!client) {
      this.log.warn('Redis unavailable; roulette admin config using defaults / memory');
      if (
        rouletteConfigMemoryFallback &&
        validateRouletteAdminConfig(rouletteConfigMemoryFallback)
      ) {
        return cloneRouletteAdminConfig(rouletteConfigMemoryFallback);
      }
      return defaults;
    }

    try {
      const hash = await client.hgetall(this.key);
      const empty = Object.keys(hash).length === 0;

      let resolved: RouletteAdminConfig;

      if (empty) {
        resolved = defaults;
        await client.hset(this.key, rouletteConfigToRedisFields(resolved));
      } else {
        resolved = rouletteConfigFromRedisHash(hash, defaults);
        if (!validateRouletteAdminConfig(resolved)) {
          this.log.warn('roulette admin config invalid; resetting defaults in Redis');
          resolved = defaults;
          await client.hset(this.key, rouletteConfigToRedisFields(resolved));
        } else if (hashMissingAnyField(hash)) {
          await client.hset(this.key, rouletteConfigToRedisFields(resolved));
        }
      }

      rouletteConfigMemoryFallback = cloneRouletteAdminConfig(resolved);
      return cloneRouletteAdminConfig(resolved);
    } catch (e) {
      this.log.warn(
        `roulette config Redis HGETALL failed: ${e instanceof Error ? e.message : e}`,
      );
      if (
        rouletteConfigMemoryFallback &&
        validateRouletteAdminConfig(rouletteConfigMemoryFallback)
      ) {
        return cloneRouletteAdminConfig(rouletteConfigMemoryFallback);
      }
      return defaults;
    }
  }

  async saveFull(config: RouletteAdminConfig): Promise<void> {
    rouletteConfigMemoryFallback = cloneRouletteAdminConfig(config);
    const client = this.redisManager.getClient();
    if (!client) {
      this.log.warn('Redis unavailable; roulette admin config saved in memory only');
      return;
    }
    try {
      await client.hset(this.key, rouletteConfigToRedisFields(config));
    } catch (e) {
      this.log.warn(
        `roulette config Redis HSET failed (in-memory copy kept): ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
