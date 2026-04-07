import { Injectable } from '@nestjs/common';
import {
  CrashPlayerControlStatus,
  GameType,
  Prisma,
} from '@prisma/client';
import { WAGERING_STATS_SETTLED_STATUSES } from '../../analytics/domain/wagering-settled-status';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CrashPlayersListCriteria,
  CrashPlayersSortField,
} from '../domain/crash-player-list.criteria';
import type { CrashPlayerListPage, CrashPlayerListRow } from '../domain/crash-player-list.row';
import type { CrashPlayersModerationFilter } from '../domain/crash-player-public-status';
import { mapControlToPublicStatus } from '../domain/map-control-to-public-status';

type ListQueryRow = {
  username: string;
  total_wagered: Prisma.Decimal | null;
  profit_loss: Prisma.Decimal | null;
  total_bets: bigint | number | null;
  control_status: CrashPlayerControlStatus | null;
  max_bet: Prisma.Decimal | null;
  min_sec: number | null;
};

type CountQueryRow = { c: bigint | number | null };

@Injectable()
export class PrismaCrashPlayersListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(criteria: CrashPlayersListCriteria): Promise<CrashPlayerListPage> {
    const { from, to, page, limit } = criteria;
    const skip = (page - 1) * limit;
    const search = criteria.search?.trim();
    const statusFilter = moderationStatusSql(criteria.status);
    const orderSql = orderBySql(criteria.sort, criteria.order);

    const [data, countRows] = search
      ? await Promise.all([
          this.prisma.$queryRaw<ListQueryRow[]>(Prisma.sql`
            WITH crash_stats AS (${crashStatsSelect(from, to)})
            SELECT
              u."username" AS username,
              cs.total_wagered AS total_wagered,
              cs.profit_loss AS profit_loss,
              cs.total_bets AS total_bets,
              cpc."status" AS control_status,
              cpc."maxBetAmount" AS max_bet,
              cpc."minSecondsBetweenBets" AS min_sec
            FROM "User" u
            LEFT JOIN crash_stats cs ON cs.username = u."username"
            LEFT JOIN "CrashPlayerControl" cpc ON cpc."userUsername" = u."username"
            WHERE u."username" ILIKE ${'%' + search + '%'}
              AND ${statusFilter}
            ORDER BY ${orderSql}
            LIMIT ${limit} OFFSET ${skip}
          `),
          this.prisma.$queryRaw<CountQueryRow[]>(Prisma.sql`
            WITH crash_stats AS (${crashStatsSelect(from, to)})
            SELECT COUNT(*)::bigint AS c
            FROM "User" u
            LEFT JOIN crash_stats cs ON cs.username = u."username"
            LEFT JOIN "CrashPlayerControl" cpc ON cpc."userUsername" = u."username"
            WHERE u."username" ILIKE ${'%' + search + '%'}
              AND ${statusFilter}
          `),
        ])
      : await Promise.all([
          this.prisma.$queryRaw<ListQueryRow[]>(Prisma.sql`
            WITH crash_stats AS (${crashStatsSelect(from, to)})
            SELECT
              u."username" AS username,
              cs.total_wagered AS total_wagered,
              cs.profit_loss AS profit_loss,
              cs.total_bets AS total_bets,
              cpc."status" AS control_status,
              cpc."maxBetAmount" AS max_bet,
              cpc."minSecondsBetweenBets" AS min_sec
            FROM crash_stats cs
            INNER JOIN "User" u ON u."username" = cs.username
            LEFT JOIN "CrashPlayerControl" cpc ON cpc."userUsername" = u."username"
            WHERE ${statusFilter}
            ORDER BY ${orderSql}
            LIMIT ${limit} OFFSET ${skip}
          `),
          this.prisma.$queryRaw<CountQueryRow[]>(Prisma.sql`
            WITH crash_stats AS (${crashStatsSelect(from, to)})
            SELECT COUNT(*)::bigint AS c
            FROM crash_stats cs
            INNER JOIN "User" u ON u."username" = cs.username
            LEFT JOIN "CrashPlayerControl" cpc ON cpc."userUsername" = u."username"
            WHERE ${statusFilter}
          `),
        ]);

    return {
      items: data.map(toRow),
      total: toIntCount(countRows[0]?.c),
    };
  }
}

function crashStatsSelect(from: Date, to: Date): Prisma.Sql {
  return Prisma.sql`
    SELECT
      gh."username" AS username,
      SUM(gh."betAmount")::numeric(24, 4) AS total_wagered,
      SUM(COALESCE(gh."profit", 0))::numeric(24, 4) AS profit_loss,
      COUNT(*)::bigint AS total_bets
    FROM "GameHistory" gh
    WHERE gh."gameType" = ${GameType.CRASH}::"GameType"
      AND gh."createdAt" >= ${from}
      AND gh."createdAt" < ${to}
      AND gh."status"::text IN (${Prisma.join(WAGERING_STATS_SETTLED_STATUSES)})
    GROUP BY gh."username"
  `;
}

function moderationStatusSql(
  status: CrashPlayersModerationFilter | undefined,
): Prisma.Sql {
  if (!status) return Prisma.sql`TRUE`;
  if (status === 'active') {
    return Prisma.sql`(cpc."userUsername" IS NULL OR cpc."status" = ${CrashPlayerControlStatus.ACTIVE}::"CrashPlayerControlStatus")`;
  }
  if (status === 'limited') {
    return Prisma.sql`cpc."status" = ${CrashPlayerControlStatus.LIMITED}::"CrashPlayerControlStatus"`;
  }
  return Prisma.sql`cpc."status" = ${CrashPlayerControlStatus.BANNED}::"CrashPlayerControlStatus"`;
}

/** Whitelist-only fragments for ORDER BY. */
function orderBySql(
  sort: CrashPlayersSortField,
  order: 'asc' | 'desc',
): Prisma.Sql {
  const dir = order === 'desc' ? 'DESC' : 'ASC';
  switch (sort) {
    case 'username':
      return Prisma.raw(`u."username" ${dir}`);
    case 'profitLoss':
      return Prisma.raw(`COALESCE(cs.profit_loss, 0) ${dir}`);
    case 'totalBets':
      return Prisma.raw(`COALESCE(cs.total_bets, 0) ${dir}`);
    default:
      return Prisma.raw(`COALESCE(cs.total_wagered, 0) ${dir}`);
  }
}

function toRow(r: ListQueryRow): CrashPlayerListRow {
  const tw = r.total_wagered ?? new Prisma.Decimal(0);
  const pl = r.profit_loss ?? new Prisma.Decimal(0);
  const bets = toIntCount(r.total_bets);
  const publicStatus = mapControlToPublicStatus(r.control_status ?? undefined);
  const limits =
    publicStatus === 'limited'
      ? {
          maxBetAmount: r.max_bet !== null ? r.max_bet.toFixed(2) : null,
          minSecondsBetweenBets: r.min_sec,
        }
      : null;

  return {
    username: r.username,
    totalWagered: tw.toFixed(2),
    profitLoss: pl.toFixed(2),
    totalBets: bets,
    status: publicStatus,
    limits,
  };
}

function toIntCount(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
