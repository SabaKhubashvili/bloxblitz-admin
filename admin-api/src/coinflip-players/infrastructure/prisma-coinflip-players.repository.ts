import { Injectable } from '@nestjs/common';
import {
  CoinflipPlayerControlStatus,
  GameStatus,
  GameType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CoinflipPlayersListCriteria } from '../domain/coinflip-player-list.criteria';
import type {
  CoinflipPlayerHistoryPage,
  CoinflipPlayerHistoryRow,
} from '../domain/coinflip-player-history.types';
import type {
  CoinflipPlayerListRow,
  CoinflipPlayersListPage,
} from '../domain/coinflip-player-list.row';
import type { CoinflipPlayersModerationFilter } from '../domain/coinflip-player-public-status';
import { mapCoinflipControlStatus } from '../domain/map-coinflip-control-status';

type ListQueryRow = {
  user_id: string;
  username: string;
  total_games: number;
  total_wagered: Prisma.Decimal;
  total_payout: Prisma.Decimal;
  games_won: number;
  games_lost: number;
  control_status: CoinflipPlayerControlStatus | null;
  max_wager: Prisma.Decimal | null;
  max_gph: number | null;
};

type HistoryQueryRow = {
  game_id: string;
  player1_username: string;
  player2_username: string;
  player1_side: string;
  winner_side: string;
  total_pot: Prisma.Decimal;
  gh_username: string;
  profit: Prisma.Decimal | null;
  created_at: Date;
};

type CountRow = { c: bigint | number | null };

@Injectable()
export class PrismaCoinflipPlayersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPlayersPage(
    criteria: CoinflipPlayersListCriteria,
  ): Promise<CoinflipPlayersListPage> {
    const skip = (criteria.page - 1) * criteria.limit;
    const statusFilter = moderationFilterSql(criteria.status);
    const orderExpr = listOrderExpression(criteria.sort);
    const orderDirSuffix = listOrderDirectionSuffix(criteria.order);

    const userId = criteria.userId?.trim() ?? null;
    const search = criteria.searchUsername?.trim() ?? null;

    const userPredicate =
      userId !== null
        ? Prisma.sql`u.id = ${userId}`
        : search !== null && search.length > 0
          ? Prisma.sql`u.username ILIKE ${'%' + search + '%'}`
          : Prisma.sql`TRUE`;

    const [data, countRows] = await Promise.all([
      this.prisma.$queryRaw<ListQueryRow[]>(Prisma.sql`
        WITH finished_cf_p1 AS (
          SELECT cg."player1Username" AS username
          FROM "CoinflipGameHistory" cg
          INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
          WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
        ),
        finished_cf_p2 AS (
          SELECT cg."player2Username" AS username
          FROM "CoinflipGameHistory" cg
          INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
          WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
        ),
        stats_cf AS (
          SELECT s_only."userUsername" AS username
          FROM "UserGameStatistics" s_only
          WHERE s_only."gameType" = ${GameType.COINFLIP}::"GameType"
        ),
        coinflip_player_usernames AS (
          SELECT username FROM finished_cf_p1
          UNION
          SELECT username FROM finished_cf_p2
          UNION
          SELECT username FROM stats_cf
        )
        SELECT
          lr.user_id,
          lr.username,
          lr.total_games,
          lr.total_wagered,
          lr.total_payout,
          lr.games_won,
          lr.games_lost,
          lr.control_status,
          lr.max_wager,
          lr.max_gph
        FROM (
          SELECT
            u.id AS user_id,
            u.username AS username,
            COALESCE(s."totalGames", hist.hgames, 0) AS total_games,
            COALESCE(s."totalWagered", hist.hwagered, 0) AS total_wagered,
            COALESCE(s."totalPayout", hist.hwagered + hist.hprofit, 0) AS total_payout,
            COALESCE(s."gamesWon", hist.hwins, 0) AS games_won,
            COALESCE(s."gamesLost", hist.hgames - hist.hwins, 0) AS games_lost,
            cpc."status" AS control_status,
            cpc."maxWagerAmount" AS max_wager,
            cpc."maxGamesPerHour" AS max_gph
          FROM coinflip_player_usernames cpu
          INNER JOIN "User" u ON u.username = cpu.username
          LEFT JOIN "UserGameStatistics" s
            ON s."userUsername" = u.username
            AND s."gameType" = ${GameType.COINFLIP}::"GameType"
          LEFT JOIN "CoinflipPlayerControl" cpc ON cpc."userUsername" = u.username
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS hgames,
              COALESCE(SUM(gh."betAmount"::numeric / 2), 0) AS hwagered,
              COALESCE(SUM(
                CASE
                  WHEN gh."username" = u.username AND gh.profit IS NOT NULL THEN gh."profit"::numeric
                  WHEN (
                    cg."player1Username" = u.username
                    AND cg."winnerSide" = cg."player1Side"
                  ) OR (
                    cg."player2Username" = u.username
                    AND cg."winnerSide" <> cg."player1Side"
                  )
                  THEN gh."betAmount"::numeric / 2
                  ELSE -gh."betAmount"::numeric / 2
                END
              ), 0) AS hprofit,
              COALESCE(SUM(
                CASE
                  WHEN (
                    cg."player1Username" = u.username
                    AND cg."winnerSide" = cg."player1Side"
                  ) OR (
                    cg."player2Username" = u.username
                    AND cg."winnerSide" <> cg."player1Side"
                  )
                  THEN 1
                  ELSE 0
                END
              ), 0)::int AS hwins
            FROM "CoinflipGameHistory" cg
            INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
            WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
              AND (
                cg."player1Username" = u.username
                OR cg."player2Username" = u.username
              )
          ) hist ON TRUE
          WHERE ${userPredicate}
            AND ${statusFilter}
        ) AS lr
        ORDER BY ${orderExpr} ${orderDirSuffix}
        LIMIT ${criteria.limit} OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        WITH finished_cf_p1 AS (
          SELECT cg."player1Username" AS username
          FROM "CoinflipGameHistory" cg
          INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
          WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
        ),
        finished_cf_p2 AS (
          SELECT cg."player2Username" AS username
          FROM "CoinflipGameHistory" cg
          INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
          WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
        ),
        stats_cf AS (
          SELECT s_only."userUsername" AS username
          FROM "UserGameStatistics" s_only
          WHERE s_only."gameType" = ${GameType.COINFLIP}::"GameType"
        ),
        coinflip_player_usernames AS (
          SELECT username FROM finished_cf_p1
          UNION
          SELECT username FROM finished_cf_p2
          UNION
          SELECT username FROM stats_cf
        )
        SELECT COUNT(*)::bigint AS c
        FROM coinflip_player_usernames cpu
        INNER JOIN "User" u ON u.username = cpu.username
        LEFT JOIN "CoinflipPlayerControl" cpc ON cpc."userUsername" = u.username
        WHERE ${userPredicate}
          AND ${statusFilter}
      `),
    ]);

    return {
      items: data.map(toListRow),
      total: toIntCount(countRows[0]?.c),
    };
  }

  async findHistoryPage(
    username: string,
    page: number,
    limit: number,
  ): Promise<CoinflipPlayerHistoryPage> {
    const safeLimit = Math.min(100, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [countRows, rows] = await Promise.all([
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS c
        FROM "CoinflipGameHistory" cg
        INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
        WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
          AND (cg."player1Username" = ${username} OR cg."player2Username" = ${username})
      `),
      this.prisma.$queryRaw<HistoryQueryRow[]>(Prisma.sql`
        SELECT
          cg."gameId" AS game_id,
          cg."player1Username" AS player1_username,
          cg."player2Username" AS player2_username,
          cg."player1Side"::text AS player1_side,
          cg."winnerSide"::text AS winner_side,
          gh."betAmount" AS total_pot,
          gh.username AS gh_username,
          gh.profit AS profit,
          cg."createdAt" AS created_at
        FROM "CoinflipGameHistory" cg
        INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
        WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
          AND (cg."player1Username" = ${username} OR cg."player2Username" = ${username})
        ORDER BY cg."createdAt" DESC
        LIMIT ${safeLimit} OFFSET ${skip}
      `),
    ]);

    const total = toIntCount(countRows[0]?.c);
    const items: CoinflipPlayerHistoryRow[] = rows.map((r) =>
      mapHistoryRow(r, username),
    );
    return { items, total };
  }
}

function mapHistoryRow(
  r: HistoryQueryRow,
  viewerUsername: string,
): CoinflipPlayerHistoryRow {
  const p1 = r.player1_username;
  const p2 = r.player2_username;
  const isP1 = viewerUsername === p1;
  const opponent = isP1 ? p2 : p1;

  const p1Won = r.winner_side === r.player1_side;
  const viewerWon = isP1 ? p1Won : !p1Won;

  const pot = new Prisma.Decimal(r.total_pot ?? 0);
  const halfPot = pot.div(2);

  let profitLoss: Prisma.Decimal;
  if (r.gh_username === viewerUsername && r.profit != null) {
    profitLoss = new Prisma.Decimal(r.profit);
  } else {
    profitLoss = viewerWon ? halfPot : halfPot.negated();
  }

  return {
    gameId: r.game_id,
    opponentUsername: opponent,
    wagerAmount: roundMoney(halfPot),
    result: viewerWon ? 'win' : 'loss',
    profitLoss: roundMoney(profitLoss),
    createdAt: r.created_at.toISOString(),
  };
}

/**
 * When the joiner is viewing history, profit uses half-pot heuristics (equal-stakes PvP).
 * Main `GameHistory` row stores authoritative profit for the recorded `username` only.
 */
function roundMoney(d: Prisma.Decimal): string {
  return d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
}

function toListRow(r: ListQueryRow): CoinflipPlayerListRow {
  const tw = new Prisma.Decimal(r.total_wagered ?? 0);
  const tp = new Prisma.Decimal(r.total_payout ?? 0);
  const profit = tp.minus(tw);
  const g = r.total_games;
  const wins = r.games_won;
  const losses = r.games_lost;
  const winRate =
    g > 0 ? Math.round((wins / g) * 10_000) / 100 : 0;
  const status = mapCoinflipControlStatus(r.control_status ?? undefined);

  const limits =
    status === 'limited'
      ? {
          maxWagerAmount:
            r.max_wager !== null ? r.max_wager.toFixed(2) : null,
          maxGamesPerHour: r.max_gph,
        }
      : null;

  return {
    userId: r.user_id,
    username: r.username,
    totalGames: g,
    totalWagered: tw.toFixed(2),
    wins,
    losses,
    winRate,
    profitLoss: profit.toFixed(2),
    status,
    limits,
  };
}

function moderationFilterSql(
  status: CoinflipPlayersModerationFilter,
): Prisma.Sql {
  if (!status) return Prisma.sql`TRUE`;
  if (status === 'active') {
    return Prisma.sql`(cpc."userUsername" IS NULL OR cpc."status" = ${CoinflipPlayerControlStatus.ACTIVE}::"CoinflipPlayerControlStatus")`;
  }
  if (status === 'limited') {
    return Prisma.sql`cpc."status" = ${CoinflipPlayerControlStatus.LIMITED}::"CoinflipPlayerControlStatus"`;
  }
  return Prisma.sql`cpc."status" = ${CoinflipPlayerControlStatus.BANNED}::"CoinflipPlayerControlStatus"`;
}

/** Sort key only — direction is a separate fragment so Prisma does not parenthesize `col DESC`. */
function listOrderExpression(
  sort: CoinflipPlayersListCriteria['sort'],
): Prisma.Sql {
  switch (sort) {
    case 'username':
      return Prisma.sql`lr."username"`;
    case 'profitLoss':
      return Prisma.sql`(lr."total_payout" - lr."total_wagered")`;
    case 'winRate':
      return Prisma.sql`(CASE WHEN lr."total_games" > 0 THEN (lr."games_won"::numeric / lr."total_games"::numeric) ELSE 0 END)`;
    case 'totalGames':
      return Prisma.sql`lr."total_games"`;
    default:
      return Prisma.sql`lr."total_wagered"`;
  }
}

function listOrderDirectionSuffix(order: 'asc' | 'desc'): Prisma.Sql {
  return order === 'desc'
    ? Prisma.sql`DESC NULLS LAST`
    : Prisma.sql`ASC NULLS LAST`;
}

function toIntCount(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
