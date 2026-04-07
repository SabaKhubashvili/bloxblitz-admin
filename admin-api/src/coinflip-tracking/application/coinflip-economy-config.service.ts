import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  COINFLIP_ECONOMY_CONFIG_DEFAULTS,
  type CoinflipEconomyConfig,
} from '../domain/coinflip-economy-config';
import { CoinflipEconomyConfigRedisStore } from '../infrastructure/coinflip-economy-config.redis';

const MAX_OPTIMISTIC_ATTEMPTS = 24;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

@Injectable()
export class CoinflipEconomyConfigService {
  private readonly log = new Logger(CoinflipEconomyConfigService.name);

  constructor(private readonly redisStore: CoinflipEconomyConfigRedisStore) {}

  /**
   * Resolved config: stored JSON merged on top of defaults per field.
   * Missing key, corrupt JSON, or no Redis → full defaults; logs when applicable.
   */
  async getConfig(): Promise<CoinflipEconomyConfig> {
    if (!this.redisStore.redisAvailable()) {
      this.log.warn(
        'Coinflip economy: Redis unavailable; returning default config values.',
      );
      return { ...COINFLIP_ECONOMY_CONFIG_DEFAULTS };
    }

    const raw = await this.redisStore.readRaw();
    if (raw === null) {
      this.log.log(
        `Coinflip economy: key ${this.redisStore.getRedisKey()} missing; returning defaults.`,
      );
      return { ...COINFLIP_ECONOMY_CONFIG_DEFAULTS };
    }

    const parsed = this.tryParseStored(raw);
    if (!parsed) {
      this.log.warn(
        `Coinflip economy: corrupt JSON at ${this.redisStore.getRedisKey()}; returning defaults.`,
      );
      return { ...COINFLIP_ECONOMY_CONFIG_DEFAULTS };
    }

    return parsed;
  }

  async updatePartial(
    patch: Partial<CoinflipEconomyConfig>,
  ): Promise<CoinflipEconomyConfig> {
    if (!this.redisStore.redisAvailable()) {
      throw new ServiceUnavailableException(
        'Coinflip economy updates require Redis (REDIS_URL or REDIS_HOST).',
      );
    }

    let lastMerged: CoinflipEconomyConfig | undefined;

    for (let attempt = 0; attempt < MAX_OPTIMISTIC_ATTEMPTS; attempt++) {
      const ok = await this.redisStore.optimisticWrite((raw) => {
        const current = this.resolveFromRawString(raw);
        const merged = { ...current, ...patch };
        this.assertValidEconomyConfig(merged);
        lastMerged = merged;
        return JSON.stringify(merged);
      });

      if (ok) {
        return lastMerged!;
      }
    }

    throw new ServiceUnavailableException(
      'Could not save coinflip economy config due to concurrent updates; retry.',
    );
  }

  private resolveFromRawString(raw: string | null): CoinflipEconomyConfig {
    if (raw === null) {
      return { ...COINFLIP_ECONOMY_CONFIG_DEFAULTS };
    }
    const parsed = this.tryParseStored(raw);
    if (!parsed) {
      return { ...COINFLIP_ECONOMY_CONFIG_DEFAULTS };
    }
    return parsed;
  }

  private tryParseStored(raw: string): CoinflipEconomyConfig | null {
    try {
      const data: unknown = JSON.parse(raw);
      if (!isPlainObject(data)) {
        return null;
      }
      const base = { ...COINFLIP_ECONOMY_CONFIG_DEFAULTS };
      const minBet = data.minBet;
      const maxBet = data.maxBet;
      const platformFee = data.platformFee;
      const maxActiveGames = data.maxActiveGames;
      const maxGamesPerUser = data.maxGamesPerUser;
      if (typeof minBet === 'number' && Number.isFinite(minBet)) {
        base.minBet = minBet;
      }
      if (typeof maxBet === 'number' && Number.isFinite(maxBet)) {
        base.maxBet = maxBet;
      }
      if (typeof platformFee === 'number' && Number.isFinite(platformFee)) {
        base.platformFee = platformFee;
      }
      if (
        typeof maxActiveGames === 'number' &&
        Number.isFinite(maxActiveGames)
      ) {
        base.maxActiveGames = Math.trunc(maxActiveGames);
      }
      if (
        typeof maxGamesPerUser === 'number' &&
        Number.isFinite(maxGamesPerUser)
      ) {
        base.maxGamesPerUser = Math.trunc(maxGamesPerUser);
      }
      return base;
    } catch {
      return null;
    }
  }

  private assertValidEconomyConfig(c: CoinflipEconomyConfig): void {
    if (!(c.minBet > 0)) {
      throw new BadRequestException('minBet must be greater than 0.');
    }
    if (!(c.maxBet > 0)) {
      throw new BadRequestException('maxBet must be greater than 0.');
    }
    if (c.maxBet < c.minBet) {
      throw new BadRequestException(
        'maxBet must be greater than or equal to minBet.',
      );
    }
    if (!(c.platformFee >= 0) || c.platformFee > 100) {
      throw new BadRequestException(
        'platformFee must be between 0 and 100 (percent).',
      );
    }
    if (!Number.isInteger(c.maxActiveGames) || c.maxActiveGames < 1) {
      throw new BadRequestException(
        'maxActiveGames must be an integer greater than or equal to 1.',
      );
    }
    if (!Number.isInteger(c.maxGamesPerUser) || c.maxGamesPerUser < 1) {
      throw new BadRequestException(
        'maxGamesPerUser must be an integer greater than or equal to 1.',
      );
    }
  }
}
