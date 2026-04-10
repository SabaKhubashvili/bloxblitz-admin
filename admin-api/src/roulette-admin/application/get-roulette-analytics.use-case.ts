import { Injectable, Logger } from '@nestjs/common';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import {
  last24HourChartContext,
  MS_DAY,
  rollingWindowBounds,
  utcTruncateToDay,
} from '../../common/rolling-analytics-window';
import { RedisService } from '../../redis/redis.service';
import { PrismaRouletteAnalyticsRepository } from '../infrastructure/prisma-roulette-analytics.repository';
import type { RouletteAnalyticsResponseDto } from '../presentation/dto/roulette-analytics.response.dto';

const CACHE_PREFIX = 'roulette:analytics:';
const CACHE_TTL_SEC = 45;

@Injectable()
export class GetRouletteAnalyticsUseCase {
  private readonly log = new Logger(GetRouletteAnalyticsUseCase.name);

  constructor(
    private readonly repo: PrismaRouletteAnalyticsRepository,
    private readonly redisManager: RedisService,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
  ): Promise<RouletteAnalyticsResponseDto> {
    const cacheKey = `${CACHE_PREFIX}${range}`;
    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const gran: 'hour' | 'day' = range === '24h' ? 'hour' : 'day';

    const [overview, gamesBuckets, profitBuckets, outcomes] =
      await Promise.all([
        this.repo.aggregateOverview(from, to),
        this.repo.aggregateGamesByBucket(from, to, gran),
        this.repo.aggregateHouseProfitByBucket(from, to, gran),
        this.repo.aggregateOutcomeDistribution(from, to),
      ]);

    const gamesByMs = new Map(
      gamesBuckets.map((r) => [r.bucket.getTime(), r.count]),
    );
    const profitByMs = new Map(
      profitBuckets.map((r) => [r.bucket.getTime(), r.net]),
    );

    let gamesPlayedOverTime: { timestamp: string; count: number }[];
    let profitOverTime: {
      timestamp: string;
      profit: number;
      loss: number;
    }[];

    if (range === '24h') {
      const { bucketStartsUtc } = last24HourChartContext(now);
      gamesPlayedOverTime = bucketStartsUtc.map((bucket) => ({
        timestamp: bucket.toISOString(),
        count: gamesByMs.get(bucket.getTime()) ?? 0,
      }));
      profitOverTime = bucketStartsUtc.map((bucket) => {
        const net = profitByMs.get(bucket.getTime()) ?? 0;
        return splitNet(net, bucket);
      });
    } else {
      const days = enumerateUtcDaysFromRange(from, to);
      gamesPlayedOverTime = days.map((bucket) => ({
        timestamp: bucket.toISOString(),
        count: gamesByMs.get(bucket.getTime()) ?? 0,
      }));
      profitOverTime = days.map((bucket) => {
        const net = profitByMs.get(bucket.getTime()) ?? 0;
        return splitNet(net, bucket);
      });
    }

    const body: RouletteAnalyticsResponseDto = {
      range,
      metrics: {
        totalGames: overview.totalGames,
        totalWagered: overview.totalWagered,
        profit: overview.houseProfit,
        activePlayers: overview.activePlayers,
      },
      charts: {
        gamesPlayedOverTime,
        profitOverTime,
        outcomeDistribution: outcomes.map((o) => ({
          outcome: o.outcome,
          count: o.count,
        })),
      },
    };

    await this.writeCache(cacheKey, body);
    return body;
  }

  private async readCache(
    key: string,
  ): Promise<RouletteAnalyticsResponseDto | null> {
    const redis = this.redisManager.getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as RouletteAnalyticsResponseDto;
    } catch (e) {
      this.log.warn(`roulette analytics cache read failed: ${e}`);
      return null;
    }
  }

  private async writeCache(
    key: string,
    body: RouletteAnalyticsResponseDto,
  ): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(body), 'EX', CACHE_TTL_SEC);
    } catch (e) {
      this.log.warn(`roulette analytics cache write failed: ${e}`);
    }
  }
}

function splitNet(
  net: number,
  bucket: Date,
): { timestamp: string; profit: number; loss: number } {
  return {
    timestamp: bucket.toISOString(),
    profit: net > 0 ? net : 0,
    loss: net < 0 ? -net : 0,
  };
}

function enumerateUtcDaysFromRange(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let d = utcTruncateToDay(from);
  const end = utcTruncateToDay(to);
  while (d.getTime() <= end.getTime()) {
    out.push(new Date(d));
    d = new Date(d.getTime() + MS_DAY);
  }
  return out;
}
