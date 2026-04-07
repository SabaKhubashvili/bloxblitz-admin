import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  escapeIlikePattern,
  normalizeMinesPlayerSearch,
} from '../common/mines-admin-username';
import type { MinesPlayerRowDto } from './dto/mines-players.out.dto';
import { MinesPlayerControlRedisService } from '../../mines-moderation/infrastructure/mines-player-control.redis.service';
import {
  toTableStatus,
  type MinesTableModerationStatus,
} from '../../mines-moderation/domain/mines-redis-moderation.types';

type PlayerAggRow = {
  username: string;
  total_games: bigint;
  total_wins: bigint;
  total_wagered: Prisma.Decimal;
  total_profit_loss: Prisma.Decimal | null;
  avg_tiles_cleared: number | null;
};

export type GetMinesPlayersInput = {
  searchRaw: string | undefined;
  moderationStatus?: MinesTableModerationStatus | 'all';
  page?: number;
  limit?: number;
};

@Injectable()
export class GetMinesPlayersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minesControlRedis: MinesPlayerControlRedisService,
  ) {}

  async execute(
    input: GetMinesPlayersInput,
  ): Promise<{
    players: MinesPlayerRowDto[];
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

    const filter = input.moderationStatus ?? 'all';

    const allSnaps = await this.minesControlRedis.scanAllControlSnapshots();
    const banned: string[] = [];
    const limited: string[] = [];
    const moderated = new Set<string>();
    for (const [u, snap] of allSnaps) {
      moderated.add(u);
      if (snap.status === 'BANNED') banned.push(u);
      else if (snap.status === 'LIMITED') limited.push(u);
    }

    let modSql = Prisma.empty;
    if (filter === 'BANNED') {
      if (banned.length === 0) {
        return { players: [], total: 0, page, limit };
      }
      modSql = Prisma.sql`AND agg.username IN (${Prisma.join(banned)})`;
    } else if (filter === 'LIMITED') {
      if (limited.length === 0) {
        return { players: [], total: 0, page, limit };
      }
      modSql = Prisma.sql`AND agg.username IN (${Prisma.join(limited)})`;
    } else if (filter === 'ACTIVE' && moderated.size > 0) {
      const block = [...moderated];
      modSql = Prisma.sql`AND agg.username NOT IN (${Prisma.join(block)})`;
    }

    const searchSql =
      search != null && search.length > 0
        ? Prisma.sql`AND agg.username ILIKE ${`%${escapeIlikePattern(search)}%`} ESCAPE '\\'`
        : Prisma.empty;

    const whereWrap = Prisma.sql`${modSql} ${searchSql}`;

    const totalRows = await this.prisma.$queryRaw<{ c: bigint }[]>`
      WITH agg AS (
        SELECT gh.username
        FROM "GameHistory" gh
        INNER JOIN "MinesBetHistory" mbh ON mbh."gameId" = gh.id
        WHERE gh."gameType" = 'MINES'::"GameType"
          AND gh.status IN (
            'CASHED_OUT'::"GameStatus",
            'WON'::"GameStatus",
            'LOST'::"GameStatus"
          )
        GROUP BY gh.username
      )
      SELECT COUNT(*)::bigint AS c
      FROM agg
      WHERE 1=1 ${whereWrap}
    `;

    const total = Number(totalRows[0]?.c ?? 0n);

    const rows = await this.prisma.$queryRaw<PlayerAggRow[]>`
      WITH agg AS (
        SELECT
          gh.username,
          COUNT(*)::bigint AS total_games,
          SUM(
            CASE
              WHEN gh.status IN (
                'CASHED_OUT'::"GameStatus",
                'WON'::"GameStatus"
              ) THEN 1
              ELSE 0
            END
          )::bigint AS total_wins,
          COALESCE(SUM(gh."betAmount"), 0) AS total_wagered,
          COALESCE(SUM(COALESCE(gh.profit, 0)), 0) AS total_profit_loss,
          AVG(
            COALESCE(array_length(mbh."revealedTiles", 1), 0)
          )::float8 AS avg_tiles_cleared
        FROM "GameHistory" gh
        INNER JOIN "MinesBetHistory" mbh ON mbh."gameId" = gh.id
        WHERE gh."gameType" = 'MINES'::"GameType"
          AND gh.status IN (
            'CASHED_OUT'::"GameStatus",
            'WON'::"GameStatus",
            'LOST'::"GameStatus"
          )
        GROUP BY gh.username
      )
      SELECT * FROM agg
      WHERE 1=1 ${whereWrap}
      ORDER BY total_wagered DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const usernames = rows.map((r) => r.username);
    const snapPage = await this.minesControlRedis.getSnapshotsForUsernames(
      usernames,
    );

    const players: MinesPlayerRowDto[] = rows.map((r) => {
      const redisFields = snapPage.get(r.username) ?? null;
      const moderationStatus = toTableStatus(redisFields);
      return {
        id: r.username,
        username: r.username,
        totalGames: Number(r.total_games),
        totalWins: Number(r.total_wins),
        totalWagered: decimalToNumber(r.total_wagered),
        avgTilesCleared:
          r.avg_tiles_cleared == null || !Number.isFinite(r.avg_tiles_cleared)
            ? 0
            : Number(r.avg_tiles_cleared),
        profitLoss: decimalToNumber(
          r.total_profit_loss ?? new Prisma.Decimal(0),
        ),
        moderationStatus,
        maxBetAmount:
          moderationStatus === 'LIMITED'
            ? (redisFields?.maxBetAmount ?? null)
            : null,
        maxGamesPerHour:
          moderationStatus === 'LIMITED'
            ? (redisFields?.maxGamesPerHour ?? null)
            : null,
      };
    });

    return { players, total, page, limit };
  }
}

function decimalToNumber(d: Prisma.Decimal): number {
  return typeof d === 'number' ? d : Number(d.toString());
}
