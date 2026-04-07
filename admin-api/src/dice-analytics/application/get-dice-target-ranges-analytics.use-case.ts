import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  rollingWindowBounds,
  type RollingAnalyticsPreset,
} from '../../common/rolling-analytics-window';
import { RedisService } from '../../redis/redis.service';
import type {
  DiceTargetRangePctRow,
  IDiceAnalyticsRepository,
} from '../domain/dice-analytics.repository.port';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';

const CACHE_PREFIX = 'dice:analytics:v1:target-ranges:';

function cacheTtlSec(range: RollingAnalyticsPreset): number {
  return range === '24h' ? 300 : 600;
}

@Injectable()
export class GetDiceTargetRangesAnalyticsUseCase {
  private readonly log = new Logger(GetDiceTargetRangesAnalyticsUseCase.name);

  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
    private readonly redisManager: RedisService,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
    player?: string,
  ): Promise<{ ranges: DiceTargetRangePctRow[] }> {
    const cacheKey = `${CACHE_PREFIX}${range}:${player ?? 'all'}`;
    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const ranges = await this.repo.aggregateTargetChanceRanges(from, to, player);

    const body = { ranges };
    await this.writeCache(cacheKey, body, cacheTtlSec(range));
    return body;
  }

  private async readCache(
    key: string,
  ): Promise<{ ranges: DiceTargetRangePctRow[] } | null> {
    const redis = this.redisManager.getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as { ranges: DiceTargetRangePctRow[] };
    } catch (e) {
      this.log.warn(`dice target-ranges cache read failed: ${e}`);
      return null;
    }
  }

  private async writeCache(
    key: string,
    body: { ranges: DiceTargetRangePctRow[] },
    ttlSec: number,
  ): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(body), 'EX', ttlSec);
    } catch (e) {
      this.log.warn(`dice target-ranges cache write failed: ${e}`);
    }
  }
}
