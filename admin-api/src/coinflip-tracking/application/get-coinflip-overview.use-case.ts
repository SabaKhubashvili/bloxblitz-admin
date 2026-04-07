import { Inject, Injectable } from '@nestjs/common';
import {
  formatUtcDayLabel,
  formatUtcHourLabel,
  last24HourChartContext,
  MS_DAY,
  rollingWindowBounds,
  type RollingAnalyticsPreset,
  utcTruncateToDay,
} from '../../common/rolling-analytics-window';
import type { ICoinflipOverviewRepository } from '../domain/coinflip-overview.repository';
import { CoinflipActiveGamesRedisReader } from '../infrastructure/coinflip-active-games.redis';
import { COINFLIP_OVERVIEW_REPOSITORY } from '../infrastructure/coinflip-tracking.tokens';
import type {
  CoinflipChartPointDto,
  CoinflipOverviewResponseDto,
} from '../presentation/dto/coinflip-overview.response.dto';

const HOUSE_EDGE = 0.01;

@Injectable()
export class GetCoinflipOverviewUseCase {
  constructor(
    @Inject(COINFLIP_OVERVIEW_REPOSITORY)
    private readonly repo: ICoinflipOverviewRepository,
    private readonly activeGamesRedis: CoinflipActiveGamesRedisReader,
  ) {}

  async execute(
    range: RollingAnalyticsPreset = '24h',
  ): Promise<CoinflipOverviewResponseDto> {
    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);

    const [stats, activeGamesCount, gamesWagerRows, playerRows] =
      await Promise.all([
        this.repo.aggregateStats(from, to),
        this.activeGamesRedis.countActiveGames(),
        this.repo.aggregateGamesAndWagerByBucket(
          from,
          to,
          range === '24h' ? 'hour' : 'day',
        ),
        this.repo.aggregateUniquePlayersByBucket(
          from,
          to,
          range === '24h' ? 'hour' : 'day',
        ),
      ]);

    const platformProfit = stats.totalWagered * HOUSE_EDGE;

    const gamesByBucket = new Map(
      gamesWagerRows.map((r) => [r.bucket.getTime(), r]),
    );
    const playersByBucket = new Map(
      playerRows.map((r) => [r.bucket.getTime(), r.uniquePlayers]),
    );

    let gamesCreated: CoinflipChartPointDto[];
    let wagerVolume: CoinflipChartPointDto[];
    let playerActivity: CoinflipChartPointDto[];

    if (range === '24h') {
      const { bucketStartsUtc } = last24HourChartContext(now);
      gamesCreated = bucketStartsUtc.map((bucket) => {
        const row = gamesByBucket.get(bucket.getTime());
        return {
          x: formatUtcHourLabel(bucket),
          y: row?.games ?? 0,
        };
      });
      wagerVolume = bucketStartsUtc.map((bucket) => {
        const row = gamesByBucket.get(bucket.getTime());
        return {
          x: formatUtcHourLabel(bucket),
          y: row?.wager ?? 0,
        };
      });
      playerActivity = bucketStartsUtc.map((bucket) => ({
        x: formatUtcHourLabel(bucket),
        y: playersByBucket.get(bucket.getTime()) ?? 0,
      }));
    } else {
      const bucketStartsUtc = enumerateUtcDaysFromRange(from, to);
      gamesCreated = bucketStartsUtc.map((bucket) => {
        const row = gamesByBucket.get(bucket.getTime());
        return {
          x: formatUtcDayLabel(bucket),
          y: row?.games ?? 0,
        };
      });
      wagerVolume = bucketStartsUtc.map((bucket) => {
        const row = gamesByBucket.get(bucket.getTime());
        return {
          x: formatUtcDayLabel(bucket),
          y: row?.wager ?? 0,
        };
      });
      playerActivity = bucketStartsUtc.map((bucket) => ({
        x: formatUtcDayLabel(bucket),
        y: playersByBucket.get(bucket.getTime()) ?? 0,
      }));
    }

    return {
      stats: {
        totalGames: stats.totalGames,
        totalWagered: stats.totalWagered,
        platformProfit,
        activeGamesCount,
      },
      charts: {
        gamesCreated,
        wagerVolume,
        playerActivity,
      },
    };
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
