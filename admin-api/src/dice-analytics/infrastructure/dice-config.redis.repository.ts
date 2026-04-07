import { Injectable, Logger } from '@nestjs/common';
import {
  cloneDiceConfig,
  DEFAULT_DICE_CONFIG,
  DICE_CONFIG_REDIS_KEY,
  type DiceConfig,
} from '../domain/dice-config.defaults';
import type { IDiceConfigRepository } from '../domain/dice-config.repository.port';
import {
  diceConfigFromRedisHash,
  diceConfigToRedisFields,
  hashMissingAnyField,
  validateDiceConfig,
} from '../domain/dice-config.validation';
import { RedisService } from '../../redis/redis.service';

/** In-memory copy when Redis is unavailable (same pattern as mines config). */
let diceConfigMemoryFallback: DiceConfig | null = null;

@Injectable()
export class DiceConfigRedisRepository implements IDiceConfigRepository {
  private readonly log = new Logger(DiceConfigRedisRepository.name);
  private readonly key = DICE_CONFIG_REDIS_KEY;

  constructor(private readonly redisManager: RedisService) {}

  async loadResolvedConfig(): Promise<DiceConfig> {
    const client = this.redisManager.getClient();
    const defaults = cloneDiceConfig(DEFAULT_DICE_CONFIG);

    if (!client) {
      this.log.warn('Redis unavailable; dice config serving defaults / memory');
      if (
        diceConfigMemoryFallback &&
        validateDiceConfig(diceConfigMemoryFallback)
      ) {
        return cloneDiceConfig(diceConfigMemoryFallback);
      }
      return defaults;
    }

    try {
      const hash = await client.hgetall(this.key);
      const empty = Object.keys(hash).length === 0;

      let resolved: DiceConfig;

      if (empty) {
        resolved = defaults;
        await client.hset(this.key, diceConfigToRedisFields(resolved));
      } else {
        resolved = diceConfigFromRedisHash(hash, defaults);
        if (!validateDiceConfig(resolved)) {
          this.log.warn('dice config hash invalid; resetting defaults in Redis');
          resolved = defaults;
          await client.hset(this.key, diceConfigToRedisFields(resolved));
        } else if (hashMissingAnyField(hash)) {
          await client.hset(this.key, diceConfigToRedisFields(resolved));
        }
      }

      diceConfigMemoryFallback = cloneDiceConfig(resolved);
      return cloneDiceConfig(resolved);
    } catch (e) {
      this.log.warn(
        `dice config Redis HGETALL failed: ${e instanceof Error ? e.message : e}`,
      );
      if (
        diceConfigMemoryFallback &&
        validateDiceConfig(diceConfigMemoryFallback)
      ) {
        return cloneDiceConfig(diceConfigMemoryFallback);
      }
      return defaults;
    }
  }

  async saveFull(config: DiceConfig): Promise<void> {
    diceConfigMemoryFallback = cloneDiceConfig(config);
    const client = this.redisManager.getClient();
    if (!client) {
      this.log.warn('Redis unavailable; dice config saved in memory only');
      return;
    }
    try {
      await client.hset(this.key, diceConfigToRedisFields(config));
    } catch (e) {
      this.log.warn(
        `dice config Redis HSET failed (in-memory copy kept): ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
