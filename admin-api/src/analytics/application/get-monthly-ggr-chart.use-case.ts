import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GameType } from '@prisma/client';
import type { MonthlyGgrChartCriteria } from '../domain/monthly-ggr-chart.criteria';
import type {
  MonthlyGgrChartBucket,
  MonthlyGgrChartResult,
} from '../domain/monthly-ggr-chart.types';
import { isValidIanaTimeZone } from '../domain/time-zone.util';
import {
  enumerateUtcYearMonths,
  utcMonthRangeForLastNMonths,
} from '../domain/utc-month-range';
import type { IWageringStatsRepository } from '../domain/wagering-stats.repository';
import { WAGERING_STATS_REPOSITORY } from '../infrastructure/wagering-stats.tokens';

const EMPTY = '0';

@Injectable()
export class GetMonthlyGgrChartUseCase {
  constructor(
    @Inject(WAGERING_STATS_REPOSITORY)
    private readonly wagering: IWageringStatsRepository,
  ) {}

  async execute(input: MonthlyGgrChartCriteria): Promise<MonthlyGgrChartResult> {
    if (
      input.diceRollMode !== undefined &&
      input.gameType !== GameType.DICE
    ) {
      throw new BadRequestException(
        'diceRollMode filter requires gameType=DICE',
      );
    }

    const tz = input.timeZone.trim() || 'UTC';
    if (!isValidIanaTimeZone(tz)) {
      throw new BadRequestException('Invalid timeZone (expected IANA ID, e.g. UTC)');
    }

    const monthCount = Math.max(1, Math.min(input.monthCount, 60));
    const now = new Date();
    const { from, to } = utcMonthRangeForLastNMonths(now, monthCount);

    const criteria: MonthlyGgrChartCriteria = {
      ...input,
      monthCount,
      timeZone: tz,
    };

    const rows = await this.wagering.aggregateMonthlyGgrBuckets(criteria, {
      from,
      to,
    });

    const appliedFilters = {
      ...(input.gameType !== undefined && { gameType: input.gameType }),
      ...(input.diceRollMode !== undefined && {
        diceRollMode: input.diceRollMode,
      }),
    };

    const series =
      tz === 'UTC'
        ? this.mergeUtcZeroFill(from, to, rows)
        : [...rows].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));

    return {
      series,
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        timeZone: tz,
        monthsRequested: monthCount,
        appliedFilters,
      },
    };
  }

  private mergeUtcZeroFill(
    from: Date,
    to: Date,
    rows: MonthlyGgrChartBucket[],
  ): MonthlyGgrChartBucket[] {
    const byMonth = new Map(rows.map((r) => [r.month, r]));
    const keys = enumerateUtcYearMonths(from, to);
    return keys.map((month) => {
      const hit = byMonth.get(month);
      if (hit) return hit;
      return {
        month,
        totalWagered: EMPTY,
        totalPaidOut: EMPTY,
        houseProfit: EMPTY,
        ggr: EMPTY,
        betCount: 0,
        netUserLossPerBet: EMPTY,
      };
    });
  }
}
