import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  formatUtcDayLabel,
  formatUtcHourLabel,
  last24HourChartContext,
  MS_DAY,
  rollingWindowBoundsWithAll,
  type RollingAnalyticsPresetWithAll,
  utcTruncateToDay,
} from '../../common/rolling-analytics-window';
import { RedisService } from '../../redis/redis.service';
import type { ITowersOverviewRepository } from '../domain/towers-overview.repository';
import { TOWERS_OVERVIEW_REPOSITORY } from '../infrastructure/towers-overview.tokens';
import type {
  TowersOverviewChartPointDto,
  TowersOverviewResponseDto,
} from './dto/towers-overview.out.dto';

const CACHE_PREFIX = 'towers:overview:';
const CACHE_TTL_SEC = 45;

/** When `range=all`, chart buckets use this rolling window (UTC) to keep payloads bounded. */
const ALL_TIME_CHART_DAYS = 365;

@Injectable()
export class GetTowersOverviewUseCase {
  private readonly log = new Logger(GetTowersOverviewUseCase.name);

  constructor(
    @Inject(TOWERS_OVERVIEW_REPOSITORY)
    private readonly repo: ITowersOverviewRepository,
    private readonly redisManager: RedisService,
  ) {}

  async execute(
    range: RollingAnalyticsPresetWithAll = '24h',
  ): Promise<TowersOverviewResponseDto> {
    const cacheKey = `${CACHE_PREFIX}${range}`;
    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const { from: statsFrom, to } = rollingWindowBoundsWithAll(range, now);
    const chartFrom =
      range === 'all'
        ? new Date(now.getTime() - ALL_TIME_CHART_DAYS * MS_DAY)
        : statsFrom;

    const gran: 'hour' | 'day' = range === '24h' ? 'hour' : 'day';

    const [stats, bucketRows] = await Promise.all([
      this.repo.aggregateStats(statsFrom, to),
      this.repo.aggregateChartBuckets(chartFrom, to, gran),
    ]);

    const byBucketMs = new Map(
      bucketRows.map((r) => [r.bucket.getTime(), r]),
    );

    let gamesPlayed: TowersOverviewChartPointDto[];
    let profitLoss: TowersOverviewChartPointDto[];
    let avgMultiplier: TowersOverviewChartPointDto[];

    if (range === '24h') {
      const { bucketStartsUtc } = last24HourChartContext(now);
      gamesPlayed = bucketStartsUtc.map((bucket) => {
        const row = byBucketMs.get(bucket.getTime());
        return {
          x: formatUtcHourLabel(bucket),
          y: row?.gamesPlayed ?? 0,
        };
      });
      profitLoss = bucketStartsUtc.map((bucket) => {
        const row = byBucketMs.get(bucket.getTime());
        return {
          x: formatUtcHourLabel(bucket),
          y: row?.profitLoss ?? 0,
        };
      });
      avgMultiplier = bucketStartsUtc.map((bucket) => {
        const row = byBucketMs.get(bucket.getTime());
        return {
          x: formatUtcHourLabel(bucket),
          y: row?.avgMultiplier ?? 0,
        };
      });
    } else {
      const bucketStartsUtc = enumerateUtcDaysFromRange(chartFrom, to);
      gamesPlayed = bucketStartsUtc.map((bucket) => {
        const row = byBucketMs.get(bucket.getTime());
        return {
          x: formatUtcDayLabel(bucket),
          y: row?.gamesPlayed ?? 0,
        };
      });
      profitLoss = bucketStartsUtc.map((bucket) => {
        const row = byBucketMs.get(bucket.getTime());
        return {
          x: formatUtcDayLabel(bucket),
          y: row?.profitLoss ?? 0,
        };
      });
      avgMultiplier = bucketStartsUtc.map((bucket) => {
        const row = byBucketMs.get(bucket.getTime());
        return {
          x: formatUtcDayLabel(bucket),
          y: row?.avgMultiplier ?? 0,
        };
      });
    }

    const body: TowersOverviewResponseDto = {
      stats: {
        totalGamesPlayed: stats.totalGamesPlayed,
        totalWagered: stats.totalWagered,
        totalProfitLoss: stats.totalProfitLoss,
        activePlayers: stats.activePlayers,
        avgCashoutMultiplier: stats.avgCashoutMultiplier,
      },
      charts: {
        gamesPlayed,
        profitLoss,
        avgMultiplier,
      },
      chartNote:
        range === 'all'
          ? `Trend charts show the last ${ALL_TIME_CHART_DAYS} UTC days; summary stats are all-time.`
          : undefined,
    };

    await this.writeCache(cacheKey, body);
    return body;
  }

  private async readCache(
    key: string,
  ): Promise<TowersOverviewResponseDto | null> {
    const redis = this.redisManager.getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as TowersOverviewResponseDto;
    } catch (e) {
      this.log.warn(`towers overview cache read failed: ${e}`);
      return null;
    }
  }

  private async writeCache(
    key: string,
    body: TowersOverviewResponseDto,
  ): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(body), 'EX', CACHE_TTL_SEC);
    } catch (e) {
      this.log.warn(`towers overview cache write failed: ${e}`);
    }
  }
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
