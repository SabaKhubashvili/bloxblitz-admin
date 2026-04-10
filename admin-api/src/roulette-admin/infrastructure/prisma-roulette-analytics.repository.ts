import { Injectable } from '@nestjs/common';
import { GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type RouletteOverviewRow = {
  totalGames: number;
  totalWagered: number;
  houseProfit: number;
  activePlayers: number;
};

type CountBucketSql = {
  bucket: Date;
  cnt: bigint | number | null;
};

type NetBucketSql = {
  bucket: Date;
  net: string | number | null;
};

type OutcomeSql = {
  outcome: string;
  cnt: bigint | number | null;
};

type PlayerAggSql = {
  username: string;
  games: bigint | number | null;
  wagered: string | number | null;
  user_profit: string | number | null;
};

function toInt(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'bigint' ? Number(v) : v;
}

@Injectable()
export class PrismaRouletteAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateOverview(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<RouletteOverviewRow> {
    const rows = await this.prisma.$queryRaw<
      {
        total_games: bigint | number | null;
        total_wagered: string | number | null;
        house_profit: string | number | null;
        active_players: bigint | number | null;
      }[]
    >(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_games,
        COALESCE(SUM(g."betAmount"), 0)::double precision AS total_wagered,
        COALESCE(-SUM(COALESCE(g."profit", 0)), 0)::double precision AS house_profit,
        COUNT(DISTINCT g."username")::bigint AS active_players
      FROM "GameHistory" g
      WHERE g."gameType" = ${GameType.ROULETTE}::"GameType"
        AND g."createdAt" >= ${fromInclusive}
        AND g."createdAt" < ${toExclusive}
    `);
    const r = rows[0];
    return {
      totalGames: toInt(r?.total_games),
      totalWagered: Number(r?.total_wagered ?? 0),
      houseProfit: Number(r?.house_profit ?? 0),
      activePlayers: toInt(r?.active_players),
    };
  }

  async aggregateGamesByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<{ bucket: Date; count: number }[]> {
    const truncUnit =
      gran === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<CountBucketSql[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, g."createdAt" AT TIME ZONE 'UTC') AS bucket,
        COUNT(*)::bigint AS cnt
      FROM "GameHistory" g
      WHERE g."gameType" = ${GameType.ROULETTE}::"GameType"
        AND g."createdAt" >= ${fromInclusive}
        AND g."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((row) => ({
      bucket: row.bucket,
      count: toInt(row.cnt),
    }));
  }

  async aggregateHouseProfitByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<{ bucket: Date; net: number }[]> {
    const truncUnit =
      gran === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<NetBucketSql[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, g."createdAt" AT TIME ZONE 'UTC') AS bucket,
        (
          COALESCE(-SUM(COALESCE(g."profit", 0)), 0)
        )::double precision AS net
      FROM "GameHistory" g
      WHERE g."gameType" = ${GameType.ROULETTE}::"GameType"
        AND g."createdAt" >= ${fromInclusive}
        AND g."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((row) => ({
      bucket: row.bucket,
      net: Number(row.net ?? 0),
    }));
  }

  async aggregateOutcomeDistribution(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<{ outcome: string; count: number }[]> {
    const rows = await this.prisma.$queryRaw<OutcomeSql[]>(Prisma.sql`
      SELECT r."outcome"::text AS outcome, COUNT(*)::bigint AS cnt
      FROM "RouletteRound" r
      WHERE r."finished" = true
        AND COALESCE(r."finishedAt", r."createdAt") >= ${fromInclusive}
        AND COALESCE(r."finishedAt", r."createdAt") < ${toExclusive}
      GROUP BY r."outcome"
      ORDER BY r."outcome"::text ASC
    `);
    return rows.map((row) => ({
      outcome: row.outcome,
      count: toInt(row.cnt),
    }));
  }

  async listRecentBets(opts: {
    take: number;
    username?: string;
  }): Promise<
    {
      id: string;
      username: string;
      betAmount: number;
      profit: number | null;
      multiplier: number | null;
      status: string;
      createdAt: Date;
    }[]
  > {
    const take = Math.min(100, Math.max(1, opts.take));
    const where: Prisma.GameHistoryWhereInput = {
      gameType: GameType.ROULETTE,
      ...(opts.username?.trim()
        ? {
            username: {
              contains: opts.username.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };
    const rows = await this.prisma.gameHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        username: true,
        betAmount: true,
        profit: true,
        multiplier: true,
        status: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      betAmount: Number(r.betAmount),
      profit: r.profit !== null ? Number(r.profit) : null,
      multiplier: r.multiplier !== null ? Number(r.multiplier) : null,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async listPlayerAggregates(opts: {
    limit: number;
    offset: number;
    sort: 'wagered' | 'profit' | 'games';
    order: 'asc' | 'desc';
    username?: string;
  }): Promise<{ rows: PlayerAggSql[]; total: number }> {
    const limit = Math.min(100, Math.max(1, opts.limit));
    const offset = Math.max(0, opts.offset);
    const sortCol =
      opts.sort === 'wagered'
        ? 'wagered'
        : opts.sort === 'profit'
          ? 'user_profit'
          : 'games';
    const orderDir = opts.order === 'asc' ? 'ASC' : 'DESC';

    const filter = opts.username?.trim()
      ? Prisma.sql`AND g."username" ILIKE ${'%' + opts.username.trim().replace(/%/g, '\\%') + '%'}`
      : Prisma.empty;

    const countRows = await this.prisma.$queryRaw<{ c: bigint | number | null }[]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS c FROM (
          SELECT g."username"
          FROM "GameHistory" g
          WHERE g."gameType" = ${GameType.ROULETTE}::"GameType"
          ${filter}
          GROUP BY g."username"
        ) t
      `,
    );
    const total = toInt(countRows[0]?.c);

    const rows = await this.prisma.$queryRaw<PlayerAggSql[]>(Prisma.sql`
      SELECT
        g."username" AS username,
        COUNT(*)::bigint AS games,
        COALESCE(SUM(g."betAmount"), 0)::double precision AS wagered,
        COALESCE(SUM(COALESCE(g."profit", 0)), 0)::double precision AS user_profit
      FROM "GameHistory" g
      WHERE g."gameType" = ${GameType.ROULETTE}::"GameType"
      ${filter}
      GROUP BY g."username"
      ORDER BY ${Prisma.raw(`${sortCol} ${orderDir}`)}
      LIMIT ${limit} OFFSET ${offset}
    `);

    return { rows, total };
  }
}
