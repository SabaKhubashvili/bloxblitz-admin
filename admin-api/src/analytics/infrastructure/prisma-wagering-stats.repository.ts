import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MonthlyGgrChartCriteria } from '../domain/monthly-ggr-chart.criteria';
import type { MonthlyGgrChartBucket } from '../domain/monthly-ggr-chart.types';
import { WAGERING_STATS_SETTLED_STATUSES } from '../domain/wagering-settled-status';
import type { WageringStatsWindowBounds } from '../domain/wagering-stats.criteria';
import type { IWageringStatsRepository } from '../domain/wagering-stats.repository';
import type { WageringWindowSnapshot } from '../domain/wagering-stats-snapshot';
import type {
  StatisticsChartDatum,
  StatisticsChartGranularity,
} from '../domain/statistics-chart.types';
import { PrismaService } from '../../prisma/prisma.service';

type WindowAggregateRow = {
  total_wagered: string | null;
  total_paid_out: string | null;
  house_profit: string | null;
  bet_count: bigint | number | null;
  net_user_loss_per_bet: string | null;
};

type MonthlyAggregateRow = {
  month: string;
  total_wagered: string | null;
  total_paid_out: string | null;
  house_profit: string | null;
  bet_count: bigint | number | null;
  net_user_loss_per_bet: string | null;
};

type StatisticsChartRow = {
  bucket_ms: bigint | number;
  total_wagered: string | null;
  total_paid_out: string | null;
  total_user_loss: string | null;
};

@Injectable()
export class PrismaWageringStatsRepository implements IWageringStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateWindow(
    bounds: WageringStatsWindowBounds,
    filters: { gameType?: string; diceRollMode?: string },
  ): Promise<WageringWindowSnapshot> {
    const whereClause = Prisma.join(
      this.buildWhereParts(bounds.from, bounds.to, filters),
      ' AND ',
    );

    const rows = await this.prisma.$queryRaw<WindowAggregateRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(gh."betAmount"), 0)::numeric(24, 4)::text AS total_wagered,
        COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)::numeric(24, 4)::text AS total_paid_out,
        (
          COALESCE(SUM(gh."betAmount"), 0)
          - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
        )::numeric(24, 4)::text AS house_profit,
        COUNT(*)::bigint AS bet_count,
        (
          (
            COALESCE(SUM(gh."betAmount"), 0)
            - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
          ) / NULLIF(COUNT(*)::numeric, 0)
        )::numeric(24, 8)::text AS net_user_loss_per_bet
      FROM "GameHistory" gh
      WHERE ${whereClause}
    `);

    const row = rows[0];
    const totalWagered = row?.total_wagered ?? '0';
    const totalPaidOut = row?.total_paid_out ?? '0';
    const houseProfit = row?.house_profit ?? '0';
    const betCount = toIntCount(row?.bet_count);
    const netUserLossPerBet = row?.net_user_loss_per_bet ?? '0';

    return {
      from: bounds.from.toISOString(),
      to: bounds.to.toISOString(),
      totalWagered,
      totalPaidOut,
      houseProfit,
      betCount,
      netUserLossPerBet,
    };
  }

  async aggregateMonthlyGgrBuckets(
    criteria: MonthlyGgrChartCriteria,
    range: { from: Date; to: Date },
  ): Promise<MonthlyGgrChartBucket[]> {
    const tz = criteria.timeZone;
    const monthBucket =
      tz === 'UTC'
        ? Prisma.sql`to_char(date_trunc('month', gh."createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM')`
        : Prisma.sql`to_char(date_trunc('month', timezone(${tz}::text, gh."createdAt")), 'YYYY-MM')`;

    const whereClause = Prisma.join(
      this.buildWhereParts(range.from, range.to, {
        gameType: criteria.gameType,
        diceRollMode: criteria.diceRollMode,
      }),
      ' AND ',
    );

    const rows = await this.prisma.$queryRaw<MonthlyAggregateRow[]>(Prisma.sql`
      SELECT
        ${monthBucket} AS month,
        COALESCE(SUM(gh."betAmount"), 0)::numeric(24, 4)::text AS total_wagered,
        COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)::numeric(24, 4)::text AS total_paid_out,
        (
          COALESCE(SUM(gh."betAmount"), 0)
          - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
        )::numeric(24, 4)::text AS house_profit,
        COUNT(*)::bigint AS bet_count,
        (
          (
            COALESCE(SUM(gh."betAmount"), 0)
            - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
          ) / NULLIF(COUNT(*)::numeric, 0)
        )::numeric(24, 8)::text AS net_user_loss_per_bet
      FROM "GameHistory" gh
      WHERE ${whereClause}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((row) => {
      const houseProfit = row.house_profit ?? '0';
      return {
        month: row.month,
        totalWagered: row.total_wagered ?? '0',
        totalPaidOut: row.total_paid_out ?? '0',
        houseProfit,
        ggr: houseProfit,
        betCount: toIntCount(row.bet_count),
        netUserLossPerBet: row.net_user_loss_per_bet ?? '0',
      };
    });
  }

  async aggregateStatisticsChartBuckets(
    range: { from: Date; to: Date },
    granularity: StatisticsChartGranularity,
    filters: { gameType?: string; diceRollMode?: string },
  ): Promise<StatisticsChartDatum[]> {
    const whereClause = Prisma.join(
      this.buildWhereParts(range.from, range.to, filters),
      ' AND ',
    );

    const trunc = this.bucketTruncSql(granularity);

    const rows = await this.prisma.$queryRaw<StatisticsChartRow[]>(Prisma.sql`
      SELECT
        (FLOOR(EXTRACT(EPOCH FROM ${trunc}) * 1000))::bigint AS bucket_ms,
        COALESCE(SUM(gh."betAmount"), 0)::numeric(24, 4)::text AS total_wagered,
        COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)::numeric(24, 4)::text AS total_paid_out,
        (
          COALESCE(SUM(gh."betAmount"), 0)
          - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
        )::numeric(24, 4)::text AS total_user_loss
      FROM "GameHistory" gh
      WHERE ${whereClause}
      GROUP BY ${trunc}
      ORDER BY 1 ASC
    `);

    return rows.map((row) => ({
      date: new Date(Number(row.bucket_ms)).toISOString(),
      totalWagered: row.total_wagered ?? '0',
      totalPaidOut: row.total_paid_out ?? '0',
      totalUserLoss: row.total_user_loss ?? '0',
    }));
  }

  private bucketTruncSql(granularity: StatisticsChartGranularity): Prisma.Sql {
    switch (granularity) {
      case 'hour':
        return Prisma.sql`date_trunc('hour', gh."createdAt" AT TIME ZONE 'UTC')`;
      case 'day':
        return Prisma.sql`date_trunc('day', gh."createdAt" AT TIME ZONE 'UTC')`;
      case 'month':
        return Prisma.sql`date_trunc('month', gh."createdAt" AT TIME ZONE 'UTC')`;
      default: {
        const _exhaustive: never = granularity;
        return _exhaustive;
      }
    }
  }

  private buildWhereParts(
    from: Date,
    to: Date,
    filters: { gameType?: string; diceRollMode?: string },
  ): Prisma.Sql[] {
    const parts: Prisma.Sql[] = [
      Prisma.sql`gh."createdAt" >= ${from}`,
      Prisma.sql`gh."createdAt" < ${to}`,
      Prisma.sql`gh."status"::text IN (${Prisma.join(WAGERING_STATS_SETTLED_STATUSES)})`,
    ];

    if (filters.gameType !== undefined) {
      parts.push(
        Prisma.sql`gh."gameType" = ${filters.gameType}::"GameType"`,
      );
    }

    if (filters.diceRollMode !== undefined) {
      parts.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "DiceBet" d
          WHERE d."gameHistoryId" = gh."id"
            AND d."rollMode" = ${filters.diceRollMode}::"DiceRollMode"
        )`,
      );
    }
    return parts;
  }
}

function toIntCount(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
