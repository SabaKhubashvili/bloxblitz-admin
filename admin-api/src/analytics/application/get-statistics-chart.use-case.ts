import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GameType } from '@prisma/client';
import { boundsForPreset } from '../domain/resolve-wagering-windows';
import {
  listStatisticsChartBucketKeys,
  normalizeChartBucketKey,
} from '../domain/statistics-chart-buckets';
import { resolveStatisticsChartGranularity } from '../domain/statistics-chart-granularity';
import type { StatisticsChartDatum } from '../domain/statistics-chart.types';
import type { StatisticsChartResult } from '../domain/statistics-chart.types';
import { WageringTimeRangePreset } from '../domain/wagering-time-range';
import type { StatisticsChartCriteria } from '../domain/statistics-chart.criteria';
import type { IWageringStatsRepository } from '../domain/wagering-stats.repository';
import { WAGERING_STATS_REPOSITORY } from '../infrastructure/wagering-stats.tokens';

const MAX_RANGE_MS = 732 * 24 * 60 * 60 * 1000; // ~2 years

@Injectable()
export class GetStatisticsChartUseCase {
  constructor(
    @Inject(WAGERING_STATS_REPOSITORY)
    private readonly wagering: IWageringStatsRepository,
  ) {}

  async execute(query: StatisticsChartCriteria): Promise<StatisticsChartResult> {
    if (
      query.diceRollMode !== undefined &&
      query.gameType !== GameType.DICE
    ) {
      throw new BadRequestException(
        'diceRollMode filter requires gameType=DICE',
      );
    }

    const partialCustom =
      (!!query.startDate && !query.endDate) ||
      (!query.startDate && !!query.endDate);
    if (partialCustom) {
      throw new BadRequestException(
        'Custom range requires both startDate and endDate',
      );
    }

    const hasCustom = !!query.startDate && !!query.endDate;
    if (!hasCustom && query.preset === undefined) {
      query.preset = WageringTimeRangePreset.LAST_7_DAYS;
    }
    if (hasCustom && query.preset !== undefined) {
      throw new BadRequestException(
        'Do not send preset together with startDate/endDate',
      );
    }

    const now = new Date();
    let from: Date;
    let to: Date;
    let presetLabel: string | undefined;

    if (hasCustom) {
      const range = this.resolveCustomRange(query.startDate!, query.endDate!);
      from = range.from;
      to = range.toExclusive;
    } else {
      const preset = query.preset!;
      const b = boundsForPreset(preset, now);
      from = b.from;
      to = b.to;
      presetLabel = preset;
    }

    if (!(from < to)) {
      throw new BadRequestException('Invalid range: end must be after start');
    }
    if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
      throw new BadRequestException('Range exceeds maximum (2 years)');
    }

    const granularity = resolveStatisticsChartGranularity(from, to);
    const filters = {
      gameType: query.gameType,
      diceRollMode: query.diceRollMode,
    };

    const raw = await this.wagering.aggregateStatisticsChartBuckets(
      { from, to },
      granularity,
      filters,
    );

    const map = new Map<string, StatisticsChartDatum>();
    for (const row of raw) {
      map.set(normalizeChartBucketKey(row.date), row);
    }

    const allKeys = listStatisticsChartBucketKeys(from, to, granularity);
    const series: StatisticsChartDatum[] = allKeys.map((k) => {
      const hit = map.get(k);
      if (hit) return hit;
      return {
        date: k,
        totalWagered: '0',
        totalPaidOut: '0',
        totalUserLoss: '0',
      };
    });

    const appliedFilters = {
      ...(query.gameType !== undefined && { gameType: query.gameType }),
      ...(query.diceRollMode !== undefined && {
        diceRollMode: query.diceRollMode,
      }),
    };

    return {
      series,
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        granularity,
        ...(presetLabel !== undefined && { preset: presetLabel }),
        appliedFilters,
      },
    };
  }

  /**
   * Calendar dates (YYYY-MM-DD) → [start of day UTC, exclusive end).
   * Full ISO datetimes: start inclusive, end used as exclusive upper bound (ISO instant).
   */
  private resolveCustomRange(
    startRaw: string,
    endRaw: string,
  ): { from: Date; toExclusive: Date } {
    const from = this.parseStartInclusive(startRaw);
    const toExclusive = this.parseEndExclusive(endRaw);
    return { from, toExclusive };
  }

  private parseStartInclusive(s: string): Date {
    if (s.length <= 10) {
      const [y, m, d] = s.split('T')[0].split('-').map(Number);
      if (!y || !m || !d) {
        throw new BadRequestException('Invalid startDate');
      }
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid startDate');
    }
    return d;
  }

  private parseEndExclusive(s: string): Date {
    if (s.length <= 10) {
      const [y, m, d] = s.split('T')[0].split('-').map(Number);
      if (!y || !m || !d) {
        throw new BadRequestException('Invalid endDate');
      }
      const startOfEndDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      return new Date(startOfEndDay.getTime() + 24 * 60 * 60 * 1000);
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid endDate');
    }
    return d;
  }
}
