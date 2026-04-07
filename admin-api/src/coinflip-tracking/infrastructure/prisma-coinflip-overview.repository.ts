import { Injectable } from '@nestjs/common';
import { GameStatus, GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CoinflipChartBucketRow,
  CoinflipOverviewStatsRow,
  CoinflipPlayerBucketRow,
  ICoinflipOverviewRepository,
} from '../domain/coinflip-overview.repository';

type StatsRow = {
  total_games: bigint | number | null;
  total_wagered: string | number | null;
};

type BucketGwRow = {
  bucket: Date;
  games: bigint | number | null;
  wager: string | number | null;
};

type BucketPlayersRow = {
  bucket: Date;
  unique_players: bigint | number | null;
};

@Injectable()
export class PrismaCoinflipOverviewRepository
  implements ICoinflipOverviewRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async aggregateStats(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<CoinflipOverviewStatsRow> {
    const rows = await this.prisma.$queryRaw<StatsRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_games,
        COALESCE(SUM(gh."betAmount"), 0)::double precision AS total_wagered
      FROM "GameHistory" gh
      WHERE gh."gameType" = ${GameType.COINFLIP}::"GameType"
        AND gh."status" = ${GameStatus.FINISHED}::"GameStatus"
        AND gh."createdAt" >= ${fromInclusive}
        AND gh."createdAt" < ${toExclusive}
    `);

    const r = rows[0];
    return {
      totalGames: toBigIntNumber(r?.total_games),
      totalWagered: Number(r?.total_wagered ?? 0),
    };
  }

  async aggregateGamesAndWagerByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<CoinflipChartBucketRow[]> {
    const truncUnit =
      gran === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<BucketGwRow[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, gh."createdAt" AT TIME ZONE 'UTC') AS bucket,
        COUNT(*)::bigint AS games,
        COALESCE(SUM(gh."betAmount"), 0)::double precision AS wager
      FROM "GameHistory" gh
      WHERE gh."gameType" = ${GameType.COINFLIP}::"GameType"
        AND gh."status" = ${GameStatus.FINISHED}::"GameStatus"
        AND gh."createdAt" >= ${fromInclusive}
        AND gh."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((row) => ({
      bucket: new Date(row.bucket),
      games: toBigIntNumber(row.games),
      wager: Number(row.wager ?? 0),
    }));
  }

  async aggregateUniquePlayersByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<CoinflipPlayerBucketRow[]> {
    const truncUnit =
      gran === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<BucketPlayersRow[]>(Prisma.sql`
      SELECT
        b.bucket,
        COUNT(DISTINCT b.u)::bigint AS unique_players
      FROM (
        SELECT
          date_trunc(${truncUnit}, cf."createdAt" AT TIME ZONE 'UTC') AS bucket,
          cf."player1Username" AS u
        FROM "CoinflipGameHistory" cf
        INNER JOIN "GameHistory" gh ON gh.id = cf."gameId"
        WHERE gh."gameType" = ${GameType.COINFLIP}::"GameType"
          AND gh."status" = ${GameStatus.FINISHED}::"GameStatus"
          AND cf."createdAt" >= ${fromInclusive}
          AND cf."createdAt" < ${toExclusive}
        UNION ALL
        SELECT
          date_trunc(${truncUnit}, cf."createdAt" AT TIME ZONE 'UTC') AS bucket,
          cf."player2Username" AS u
        FROM "CoinflipGameHistory" cf
        INNER JOIN "GameHistory" gh ON gh.id = cf."gameId"
        WHERE gh."gameType" = ${GameType.COINFLIP}::"GameType"
          AND gh."status" = ${GameStatus.FINISHED}::"GameStatus"
          AND cf."createdAt" >= ${fromInclusive}
          AND cf."createdAt" < ${toExclusive}
      ) b
      GROUP BY b.bucket
      ORDER BY 1 ASC
    `);

    return rows.map((row) => ({
      bucket: new Date(row.bucket),
      uniquePlayers: toBigIntNumber(row.unique_players),
    }));
  }
}

function toBigIntNumber(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
