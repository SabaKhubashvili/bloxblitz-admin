import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  formatUtcDayLabel,
  formatUtcHourLabel,
  last24HourChartContext,
  MS_DAY,
  rollingWindowBounds,
  type RollingAnalyticsPreset,
  utcTruncateToDay,
} from '../../common/rolling-analytics-window';
import { RedisService } from '../../redis/redis.service';
import type { IMinesOverviewRepository } from '../domain/mines-overview.repository';
import { MINES_OVERVIEW_REPOSITORY } from '../infrastructure/mines-overview.tokens';
import type {
  MinesOverviewChartPointDto,
  MinesOverviewResponseDto,
} from '../presentation/dto/mines-overview.response.dto';

const CACHE_PREFIX = 'mines:overview:';
const CACHE_TTL_SEC = 45;

@Injectable()
export class GetMinesOverviewUseCase {
  private readonly log = new Logger(GetMinesOverviewUseCase.name);

  constructor(
    @Inject(MINES_OVERVIEW_REPOSITORY)
    private readonly repo: IMinesOverviewRepository,
    private readonly redisManager: RedisService,
  ) {}

  async execute(
    range: RollingAnalyticsPreset = '24h',
  ): Promise<MinesOverviewResponseDto> {
    const cacheKey = `${CACHE_PREFIX}${range}`;
    const cached = await this.readCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const gran: 'hour' | 'day' = range === '24h' ? 'hour' : 'day';

    const [stats, bucketRows] = await Promise.all([
      this.repo.aggregateStats(from, to),
      this.repo.aggregateChartBuckets(from, to, gran),
    ]);

    const byBucketMs = new Map(
      bucketRows.map((r) => [r.bucket.getTime(), r]),
    );

    let gamesPlayed: MinesOverviewChartPointDto[];
    let profitLoss: MinesOverviewChartPointDto[];
    let avgMultiplier: MinesOverviewChartPointDto[];

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
      const bucketStartsUtc = enumerateUtcDaysFromRange(from, to);
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

    const body: MinesOverviewResponseDto = {
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
    };

    await this.writeCache(cacheKey, body);
    return body;
  }

  private async readCache(
    key: string,
  ): Promise<MinesOverviewResponseDto | null> {
    const redis = this.redisManager.getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as MinesOverviewResponseDto;
    } catch (e) {
      this.log.warn(`mines overview cache read failed: ${e}`);
      return null;
    }
  }

  private async writeCache(
    key: string,
    body: MinesOverviewResponseDto,
  ): Promise<void> {
    const redis = this.redisManager.getClient();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(body), 'EX', CACHE_TTL_SEC);
    } catch (e) {
      this.log.warn(`mines overview cache write failed: ${e}`);
    }
  }
}

/** Each UTC midnight from `utcTruncateToDay(from)` through `utcTruncateToDay(to)` inclusive. */
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
