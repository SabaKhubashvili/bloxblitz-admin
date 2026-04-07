import { Injectable, Logger } from '@nestjs/common';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { RedisService } from '../../redis/redis.service';
import type { DiceAnalyticsResponseDto } from '../presentation/dto/dice-analytics.response.dto';
import { GetDiceOverviewMetricsUseCase } from './get-dice-overview-metrics.use-case';
import { GetDiceRollDistributionUseCase } from './get-dice-roll-distribution.use-case';
import { GetDiceProfitTimeSeriesUseCase } from './get-dice-profit-time-series.use-case';
import { GetDiceBetDistributionUseCase } from './get-dice-bet-distribution.use-case';

const CACHE_PREFIX = 'dice:analytics:';
const CACHE_TTL_SEC = 45;

@Injectable()
export class GetDiceAnalyticsUseCase {
  private readonly log = new Logger(GetDiceAnalyticsUseCase.name);

  constructor(
    private readonly overview: GetDiceOverviewMetricsUseCase,
    private readonly rollDistribution: GetDiceRollDistributionUseCase,
    private readonly profitTimeSeries: GetDiceProfitTimeSeriesUseCase,
    private readonly betDistribution: GetDiceBetDistributionUseCase,
    private readonly redisManager: RedisService,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
  ): Promise<DiceAnalyticsResponseDto> {
    const cacheKey = `${CACHE_PREFIX}${range}`;
    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const [metrics, rollDistribution, profitOverTime, betDistribution] =
      await Promise.all([
        this.overview.execute(range),
        this.rollDistribution.execute(range),
        this.profitTimeSeries.execute(range),
        this.betDistribution.execute(range),
      ]);

    const body: DiceAnalyticsResponseDto = {
      range,
      metrics,
      charts: {
        rollDistribution,
        profitOverTime,
        betDistribution,
      },
    };

    await this.writeCache(cacheKey, body);
    return body;
  }

  private async readCache(
    key: string,
  ): Promise<DiceAnalyticsResponseDto | null> {
    const redis = this.redisManager.getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as DiceAnalyticsResponseDto;
    } catch (e) {
      this.log.warn(`dice analytics cache read failed: ${e}`);
      return null;
    }
  }

  private async writeCache(
    key: string,
    body: DiceAnalyticsResponseDto,
  ): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(body), 'EX', CACHE_TTL_SEC);
    } catch (e) {
      this.log.warn(`dice analytics cache write failed: ${e}`);
    }
  }
}
