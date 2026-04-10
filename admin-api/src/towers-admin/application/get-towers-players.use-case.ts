import { Injectable } from '@nestjs/common';
import { GameStatus, GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  escapeIlikePattern,
  normalizeMinesPlayerSearch,
} from '../../mines-overview/common/mines-admin-username';
import type { TowersPlayerRowDto } from './dto/towers-players.out.dto';

export type GetTowersPlayersInput = {
  searchRaw: string | undefined;
  page?: number;
  limit?: number;
};

type AggRow = {
  username: string;
  total_games: bigint | number | null;
  total_wagered: Prisma.Decimal | string | number | null;
  net_profit: Prisma.Decimal | string | number | null;
  avg_mult: string | number | null;
};

@Injectable()
export class GetTowersPlayersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetTowersPlayersInput): Promise<{
    players: TowersPlayerRowDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(100, Math.max(1, input.limit ?? 25));
    const offset = (page - 1) * limit;

    const search = normalizeMinesPlayerSearch(input.searchRaw);
    if (
      input.searchRaw !== undefined &&
      input.searchRaw !== null &&
      input.searchRaw.trim() !== '' &&
      search === null
    ) {
      return { players: [], total: 0, page, limit };
    }

    const searchSql =
      search != null && search.length > 0
        ? Prisma.sql`AND agg.username ILIKE ${`%${escapeIlikePattern(search)}%`} ESCAPE '\\'`
        : Prisma.empty;

    const totalRows = await this.prisma.$queryRaw<{ c: bigint }[]>(Prisma.sql`
      WITH agg AS (
        SELECT gh.username
        FROM "GameHistory" gh
        WHERE gh."gameType" = ${GameType.TOWERS}::"GameType"
          AND (
            gh."status" = ${GameStatus.CASHED_OUT}::"GameStatus"
            OR gh."status" = ${GameStatus.WON}::"GameStatus"
            OR gh."status" = ${GameStatus.LOST}::"GameStatus"
          )
        GROUP BY gh.username
      )
      SELECT COUNT(*)::bigint AS c FROM agg WHERE 1=1 ${searchSql}
    `);

    const total = Number(totalRows[0]?.c ?? 0);

    const rows = await this.prisma.$queryRaw<AggRow[]>(Prisma.sql`
      WITH agg AS (
        SELECT
          gh.username,
          COUNT(*)::bigint AS total_games,
          COALESCE(SUM(gh."betAmount"), 0) AS total_wagered,
          COALESCE(SUM(COALESCE(gh."profit", 0)), 0) AS net_profit,
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
        WHERE gh."gameType" = ${GameType.TOWERS}::"GameType"
          AND (
            gh."status" = ${GameStatus.CASHED_OUT}::"GameStatus"
            OR gh."status" = ${GameStatus.WON}::"GameStatus"
            OR gh."status" = ${GameStatus.LOST}::"GameStatus"
          )
        GROUP BY gh.username
      )
      SELECT * FROM agg WHERE 1=1 ${searchSql}
      ORDER BY total_wagered DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const players: TowersPlayerRowDto[] = rows.map((r) => ({
      username: r.username,
      totalGamesPlayed: toInt(r.total_games),
      totalWagered: decNum(r.total_wagered),
      netProfitLoss: decNum(r.net_profit),
      avgMultiplier: Number(r.avg_mult ?? 0),
    }));

    return { players, total, page, limit };
  }
}

function toInt(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Math.floor(Number(v));
}

function decNum(v: Prisma.Decimal | string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return Number(v);
}
