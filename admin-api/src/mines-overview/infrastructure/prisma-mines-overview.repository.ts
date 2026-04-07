import { Injectable } from '@nestjs/common';
import { GameStatus, GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IMinesOverviewRepository,
  MinesOverviewChartBucketRow,
  MinesOverviewStatsRow,
} from '../domain/mines-overview.repository';

type StatsSqlRow = {
  total_games: bigint | number | null;
  total_wagered: string | number | null;
  house_profit: string | number | null;
  active_players: bigint | number | null;
  avg_cashout_mult: string | number | null;
};

type BucketSqlRow = {
  bucket: Date;
  games: bigint | number | null;
  house_profit: string | number | null;
  avg_mult: string | number | null;
};

@Injectable()
export class PrismaMinesOverviewRepository implements IMinesOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateStats(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<MinesOverviewStatsRow> {
    const rows = await this.prisma.$queryRaw<StatsSqlRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_games,
        COALESCE(SUM(gh."betAmount"), 0)::double precision AS total_wagered,
        COALESCE(-SUM(COALESCE(gh."profit", 0)), 0)::double precision AS house_profit,
        COUNT(DISTINCT gh."username")::bigint AS active_players,
        COALESCE(
          AVG(gh."multiplier") FILTER (
            WHERE (
                gh."status" = ${GameStatus.CASHED_OUT}::"GameStatus"
                OR gh."status" = ${GameStatus.WON}::"GameStatus"
              )
              AND gh."multiplier" IS NOT NULL
          ),
          0
        )::double precision AS avg_cashout_mult
      FROM "GameHistory" gh
      WHERE gh."gameType" = ${GameType.MINES}::"GameType"
        AND (
          gh."status" = ${GameStatus.CASHED_OUT}::"GameStatus"
          OR gh."status" = ${GameStatus.WON}::"GameStatus"
          OR gh."status" = ${GameStatus.LOST}::"GameStatus"
        )
        AND gh."createdAt" >= ${fromInclusive}
        AND gh."createdAt" < ${toExclusive}
    `);

    const r = rows[0];
    return {
      totalGamesPlayed: toBigIntNumber(r?.total_games),
      totalWagered: Number(r?.total_wagered ?? 0),
      totalProfitLoss: Number(r?.house_profit ?? 0),
      activePlayers: toBigIntNumber(r?.active_players),
      avgCashoutMultiplier: Number(r?.avg_cashout_mult ?? 0),
    };
  }

  async aggregateChartBuckets(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<MinesOverviewChartBucketRow[]> {
    const truncUnit =
      gran === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<BucketSqlRow[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, gh."createdAt" AT TIME ZONE 'UTC') AS bucket,
        COUNT(*)::bigint AS games,
        COALESCE(-SUM(COALESCE(gh."profit", 0)), 0)::double precision AS house_profit,
        COALESCE(
          AVG(gh."multiplier") FILTER (
            WHERE (
                gh."status" = ${GameStatus.CASHED_OUT}::"GameStatus"
                OR gh."status" = ${GameStatus.WON}::"GameStatus"
              )
              AND gh."multiplier" IS NOT NULL
          ),
          0
        )::double precision AS avg_mult
      FROM "GameHistory" gh
      WHERE gh."gameType" = ${GameType.MINES}::"GameType"
        AND (
          gh."status" = ${GameStatus.CASHED_OUT}::"GameStatus"
          OR gh."status" = ${GameStatus.WON}::"GameStatus"
          OR gh."status" = ${GameStatus.LOST}::"GameStatus"
        )
        AND gh."createdAt" >= ${fromInclusive}
        AND gh."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((row) => ({
      bucket: new Date(row.bucket),
      gamesPlayed: toBigIntNumber(row.games),
      profitLoss: Number(row.house_profit ?? 0),
      avgMultiplier: Number(row.avg_mult ?? 0),
    }));
  }
}

function toBigIntNumber(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
