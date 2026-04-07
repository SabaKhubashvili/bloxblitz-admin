import { Injectable } from '@nestjs/common';
import { GameStatus, GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CoinflipHistoryRowRaw = {
  game_id: string;
  player1_username: string;
  player2_username: string;
  player1_side: string;
  winner_side: string;
  total_wager: string | number;
  created_at: Date;
};

/**
 * DB access for coinflip history list (no persistence of filter settings).
 */
@Injectable()
export class CoinflipHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Latest 20 finished coinflip games, optional case-insensitive username
   * substring match and min pot on total wager.
   */
  async findRecentFiltered(params: {
    searchNeedle: string | null;
    minPot: number | null;
  }): Promise<CoinflipHistoryRowRaw[]> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`gh."gameType" = ${GameType.COINFLIP}::"GameType"`,
      Prisma.sql`gh."status" = ${GameStatus.FINISHED}::"GameStatus"`,
    ];

    if (params.searchNeedle !== null) {
      const needle = params.searchNeedle;
      conditions.push(
        Prisma.sql`(
          strpos(lower(cg."player1Username"), lower(${needle})) > 0
          OR strpos(lower(cg."player2Username"), lower(${needle})) > 0
        )`,
      );
    }

    if (params.minPot !== null) {
      conditions.push(Prisma.sql`gh."betAmount" >= ${params.minPot}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    return this.prisma.$queryRaw<CoinflipHistoryRowRaw[]>(Prisma.sql`
      SELECT
        cg."gameId" AS game_id,
        cg."player1Username" AS player1_username,
        cg."player2Username" AS player2_username,
        cg."player1Side"::text AS player1_side,
        cg."winnerSide"::text AS winner_side,
        gh."betAmount" AS total_wager,
        cg."createdAt" AS created_at
      FROM "CoinflipGameHistory" cg
      INNER JOIN "GameHistory" gh ON gh."id" = cg."gameId"
      WHERE ${whereClause}
      ORDER BY cg."createdAt" DESC
      LIMIT 20
    `);
  }
}
