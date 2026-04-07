import { Injectable } from '@nestjs/common';
import { GameType, Prisma } from '@prisma/client';
import { WAGERING_STATS_SETTLED_STATUSES } from '../../analytics/domain/wagering-settled-status';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CrashOverviewAggregate,
  CrashPlayerActivityHourRow,
  CrashProfitLossHourRow,
  ICrashAnalyticsRepository,
  CrashMultiplierHistoryRow,
} from '../domain/crash-analytics.repository';
type OverviewRow = {
  total_wagered: string | null;
  total_payout: string | null;
  profit_loss: string | null;
  total_bets: bigint | number | null;
  active_players: bigint | number | null;
};

type HourlyPlRow = {
  bucket: Date;
  profit: string | null;
  loss: string | null;
};

type HourlyPlayersRow = {
  bucket: Date;
  active_players: bigint | number | null;
};

@Injectable()
export class PrismaCrashAnalyticsRepository implements ICrashAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateOverview(
    from: Date,
    to: Date,
  ): Promise<CrashOverviewAggregate> {
    const row = await this.prisma.$queryRaw<OverviewRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(gh."betAmount"), 0)::double precision AS total_wagered,
        COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)::double precision AS total_payout,
        (
          COALESCE(SUM(gh."betAmount"), 0)
          - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
        )::double precision AS profit_loss,
        COUNT(*)::bigint AS total_bets,
        COUNT(DISTINCT gh."username")::bigint AS active_players
      FROM "GameHistory" gh
      WHERE gh."gameType" = ${GameType.CRASH}::"GameType"
        AND gh."createdAt" >= ${from}
        AND gh."createdAt" < ${to}
        AND gh."status"::text IN (${Prisma.join(WAGERING_STATS_SETTLED_STATUSES)})
    `);

    const r = row[0];
    return {
      totalWagered: Number(r?.total_wagered ?? 0),
      totalPayout: Number(r?.total_payout ?? 0),
      profitLoss: Number(r?.profit_loss ?? 0),
      totalBets: toBigIntNumber(r?.total_bets),
      activePlayers: toBigIntNumber(r?.active_players),
    };
  }

  async listRecentCrashRounds(
    limit: number,
  ): Promise<CrashMultiplierHistoryRow[]> {
    const rows = await this.prisma.crashRound.findMany({
      where: { finished: true },
      orderBy: { finishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        crashPoint: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      roundId: r.id,
      crashMultiplier: Number(r.crashPoint),
      createdAt: r.createdAt,
    }));
  }

  async aggregateProfitLossByUtcHour(
    fromInclusive: Date,
    toInclusive: Date,
  ): Promise<CrashProfitLossHourRow[]> {
    const rows = await this.prisma.$queryRaw<HourlyPlRow[]>(Prisma.sql`
      SELECT
        date_trunc('hour', gh."createdAt" AT TIME ZONE 'UTC') AS bucket,
        GREATEST(
          0,
          COALESCE(SUM(gh."betAmount"), 0)
            - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
        )::double precision AS profit,
        GREATEST(
          0,
          -(
            COALESCE(SUM(gh."betAmount"), 0)
            - COALESCE(SUM(gh."betAmount" + COALESCE(gh."profit", 0)), 0)
          )
        )::double precision AS loss
      FROM "GameHistory" gh
      WHERE gh."gameType" = ${GameType.CRASH}::"GameType"
        AND gh."createdAt" >= ${fromInclusive}
        AND gh."createdAt" <= ${toInclusive}
        AND gh."status"::text IN (${Prisma.join(WAGERING_STATS_SETTLED_STATUSES)})
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((r) => ({
      bucketUtc: new Date(r.bucket),
      profit: Number(r.profit ?? 0),
      loss: Number(r.loss ?? 0),
    }));
  }

  async aggregateActivePlayersByUtcHour(
    fromInclusive: Date,
    toInclusive: Date,
  ): Promise<CrashPlayerActivityHourRow[]> {
    const rows = await this.prisma.$queryRaw<HourlyPlayersRow[]>(Prisma.sql`
      SELECT
        date_trunc('hour', gh."createdAt" AT TIME ZONE 'UTC') AS bucket,
        COUNT(DISTINCT gh."username")::bigint AS active_players
      FROM "GameHistory" gh
      WHERE gh."gameType" = ${GameType.CRASH}::"GameType"
        AND gh."createdAt" >= ${fromInclusive}
        AND gh."createdAt" <= ${toInclusive}
        AND gh."status"::text IN (${Prisma.join(WAGERING_STATS_SETTLED_STATUSES)})
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((r) => ({
      bucketUtc: new Date(r.bucket),
      activePlayers: toBigIntNumber(r.active_players),
    }));
  }
}

function toBigIntNumber(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
