import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

export const COINFLIP_ECONOMY_CONFIG_KEY_DEFAULT = 'coinflip:economyConfig';

const ENV_COINFLIP_ECONOMY_CONFIG_KEY = 'COINFLIP_ECONOMY_CONFIG_KEY';

/** Redis-backed coinflip economy document (single JSON string). No TTL. */
@Injectable()
export class CoinflipEconomyConfigRedisStore {
  private readonly log = new Logger(CoinflipEconomyConfigRedisStore.name);
  private readonly key: string;

  constructor(
    private readonly redisManager: RedisService,
    config: ConfigService,
  ) {
    const fromEnv = config.get<string>(ENV_COINFLIP_ECONOMY_CONFIG_KEY);
    this.key =
      typeof fromEnv === 'string' && fromEnv.trim().length > 0
        ? fromEnv.trim()
        : COINFLIP_ECONOMY_CONFIG_KEY_DEFAULT;
  }

  getRedisKey(): string {
    return this.key;
  }

  /** Missing client — caller treats as “no Redis”. */
  redisAvailable(): boolean {
    return this.redisManager.getClient() !== null;
  }

  async readRaw(): Promise<string | null> {
    const client = this.redisManager.getClient();
    if (!client) {
      return null;
    }
    try {
      return await client.get(this.key);
    } catch (e) {
      this.log.warn(
        `coinflip economy GET failed: ${e instanceof Error ? e.message : e}`,
      );
      throw new ServiceUnavailableException(
        'Could not read coinflip economy config from Redis.',
      );
    }
  }

  /**
   * Optimistic lock: read raw value, build next JSON, SET only if key unchanged since WATCH.
   * Caller must throw from `buildNextJson` to abort without EXEC.
   */
  async optimisticWrite(
    buildNextJson: (raw: string | null) => string,
  ): Promise<boolean> {
    const client = this.redisManager.getClient();
    if (!client) {
      return false;
    }

    await client.watch(this.key);
    let raw: string | null;
    try {
      raw = await client.get(this.key);
    } catch (e) {
      await client.unwatch();
      throw new ServiceUnavailableException(
        'Could not update coinflip economy config (Redis read failed).',
      );
    }

    let nextJson: string;
    try {
      nextJson = buildNextJson(raw);
    } catch (e) {
      await client.unwatch();
      throw e;
    }

    try {
      const result = await client.multi().set(this.key, nextJson).exec();
      return result !== null;
    } catch (e) {
      await client.unwatch();
      throw e;
    }
  }
}
