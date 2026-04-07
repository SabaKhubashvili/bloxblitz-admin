import { Injectable } from '@nestjs/common';
import {
  GameStatus,
  GameType,
  Prisma,
  type UserRoles,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminUserCountCriteria,
  AdminUserListCriteria,
} from '../domain/admin-user-list.criteria';
import type {
  AdminUserListPage,
  IAdminUserReadRepository,
} from '../domain/admin-user-read.repository';
import { deriveModerationStatus } from '../domain/admin-user-moderation-status.util';
import type { AdminUserStatus } from '../domain/admin-user-status';
import { deriveAdminUserStatus } from '../domain/admin-user-status.util';
import {
  emptyChatBanInfo,
  type AdminUserSummary,
} from '../domain/admin-user-summary';

@Injectable()
export class PrismaAdminUserReadRepository implements IAdminUserReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async count(criteria: AdminUserCountCriteria): Promise<number> {
    const where = this.buildWhere(criteria);
    return this.prisma.user.count({ where });
  }

  async findSummaryByUsername(
    username: string,
    activeWithinDays: number,
  ): Promise<AdminUserSummary | null> {
    const row = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        balance: true,
        role: true,
        created_at: true,
        last_login_at: true,
        last_login_ip: true,
        last_known_ip: true,
        last_user_agent: true,
        last_device: true,
        geo_country: true,
        geo_city: true,
        geo_timezone: true,
        last_active_at: true,
        login_count: true,
        ip_history: true,
        device_history: true,
        device_fingerprint: true,
        is_vpn: true,
        is_proxy: true,
        totalXP: true,
        currentLevel: true,
        statistics: {
          select: { totalWagered: true },
        },
        dicePlayerControl: { select: { status: true } },
        minesPlayerControl: { select: { status: true } },
        crashPlayerControl: { select: { status: true } },
        coinflipPlayerControl: { select: { status: true } },
      },
    });
    if (!row) {
      return null;
    }
    const wagerMap = await this.sumWageredFromHistoryForUsers([username]);
    return this.toSummary(
      row,
      activeWithinDays,
      this.wagerForUserFromMap(wagerMap, username),
    );
  }

  async findPage(criteria: AdminUserListCriteria): Promise<AdminUserListPage> {
    const where = this.buildWhere(criteria);
    const orderBy = this.buildOrderBy(criteria);
    const skip = (criteria.page - 1) * criteria.limit;

    const [totalUsers, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: criteria.limit,
        orderBy,
        select: {
          id: true,
          username: true,
          balance: true,
          role: true,
          created_at: true,
          last_login_at: true,
          last_login_ip: true,
          last_known_ip: true,
          last_user_agent: true,
          last_device: true,
          geo_country: true,
          geo_city: true,
          geo_timezone: true,
          last_active_at: true,
          login_count: true,
          ip_history: true,
          device_history: true,
          device_fingerprint: true,
          is_vpn: true,
          is_proxy: true,
          totalXP: true,
          currentLevel: true,
          statistics: {
            select: { totalWagered: true },
          },
          dicePlayerControl: { select: { status: true } },
          minesPlayerControl: { select: { status: true } },
          crashPlayerControl: { select: { status: true } },
          coinflipPlayerControl: { select: { status: true } },
        },
      }),
    ]);

    const wagerMap = await this.sumWageredFromHistoryForUsers(
      rows.map((r) => r.username),
    );
    
    const users = rows.map((row) =>
      this.toSummary(
        row,
        criteria.activeWithinDays,
        this.wagerForUserFromMap(wagerMap, row.username),
      ),
    );

    return { users, totalUsers };
  }

  /**
   * Per-user wager for admin: raw SQL over `"GameHistory"` (same pattern as
   * crash/dice admin repos — avoids ORM/groupBy quirks) excluding COINFLIP
   * (lobby row uses full pot, not per-player stakes), plus COINFLIP from
   * `UserGameStatistics` with a finished-game history fallback when stats are missing.
   */
  private async sumWageredFromHistoryForUsers(
    usernames: string[],
  ): Promise<Map<string, Prisma.Decimal>> {
    const out = new Map<string, Prisma.Decimal>();
    const unique = [...new Set(usernames.filter(Boolean))];
    if (unique.length === 0) {
      return out;
    }

    const inList = Prisma.sql`(${Prisma.join(unique.map((u) => Prisma.sql`${u}`))})`;
    type GhRow = { username: string; total: Prisma.Decimal };
    const fromHistory = await this.prisma.$queryRaw<GhRow[]>(Prisma.sql`
      SELECT gh."username" AS username,
             COALESCE(SUM(gh."betAmount"), 0)::decimal(24, 4) AS total
      FROM "GameHistory" gh
      WHERE gh."username" IN ${inList}
        AND gh."gameType" <> ${GameType.COINFLIP}::"GameType"
      GROUP BY gh."username"
    `);

    for (const row of fromHistory) {
      out.set(row.username, new Prisma.Decimal(row.total.toString()));
    }

    const coinflipAgg = await this.prisma.userGameStatistics.findMany({
      where: {
        userUsername: { in: unique },
        gameType: GameType.COINFLIP,
      },
      select: { userUsername: true, totalWagered: true },
    });

    const coinflipFromStats = new Map<string, Prisma.Decimal>();
    for (const row of coinflipAgg) {
      coinflipFromStats.set(row.userUsername, row.totalWagered);
    }

    const needsCoinflipFallback = unique.filter((u) => !coinflipFromStats.has(u));
    const coinflipFromHistory = new Map<string, Prisma.Decimal>();
    if (needsCoinflipFallback.length > 0) {
      const cfIn = Prisma.sql`(${Prisma.join(
        needsCoinflipFallback.map((u) => Prisma.sql`${u}`),
      )})`;
      type CfRow = { username: string; total: Prisma.Decimal };
      const cfRows = await this.prisma.$queryRaw<CfRow[]>(Prisma.sql`
        SELECT x.username AS username,
               COALESCE(SUM(x.w), 0)::decimal(24, 4) AS total
        FROM (
          SELECT cg."player1Username" AS username,
                 (gh."betAmount" / 2)::decimal(24, 4) AS w
          FROM "CoinflipGameHistory" cg
          INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
          WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
            AND cg."player1Username" IN ${cfIn}
          UNION ALL
          SELECT cg."player2Username" AS username,
                 (gh."betAmount" / 2)::decimal(24, 4) AS w
          FROM "CoinflipGameHistory" cg
          INNER JOIN "GameHistory" gh ON gh.id = cg."gameId"
          WHERE gh."status" = ${GameStatus.FINISHED}::"GameStatus"
            AND cg."player2Username" IN ${cfIn}
        ) x
        GROUP BY x.username
      `);
      for (const row of cfRows) {
        coinflipFromHistory.set(
          row.username,
          new Prisma.Decimal(row.total.toString()),
        );
      }
    }

    for (const u of unique) {
      const base = out.get(u) ?? new Prisma.Decimal(0);
      const cf =
        coinflipFromStats.get(u) ??
        coinflipFromHistory.get(u) ??
        new Prisma.Decimal(0);
      out.set(u, base.add(cf));
    }

    return out;
  }

  private wagerForUserFromMap(
    map: Map<string, Prisma.Decimal>,
    username: string,
  ): Prisma.Decimal {
    return map.get(username) ?? new Prisma.Decimal(0);
  }

  private buildWhere(criteria: AdminUserCountCriteria): Prisma.UserWhereInput {
    const and: Prisma.UserWhereInput[] = [];
    const q = criteria.emailSearch?.trim();
    if (q) {
      and.push({
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { rblx_id: { contains: q, mode: 'insensitive' } },
          { id: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (criteria.role !== undefined) {
      and.push({ role: criteria.role });
    }
    if (criteria.status) {
      const cutoff = new Date(
        Date.now() - criteria.activeWithinDays * 24 * 60 * 60 * 1000,
      );
      if (criteria.status === 'NEVER_LOGGED_IN') {
        and.push({ last_login_at: null });
      } else if (criteria.status === 'ACTIVE') {
        and.push({ last_login_at: { gte: cutoff } });
      } else if (criteria.status === 'INACTIVE') {
        and.push({
          last_login_at: { not: null, lt: cutoff },
        });
      }
    }
    const mod = criteria.moderationStatus;
    if (mod === 'BANNED') {
      and.push({
        OR: [
          { dicePlayerControl: { status: 'BANNED' } },
          { minesPlayerControl: { status: 'BANNED' } },
          { crashPlayerControl: { status: 'BANNED' } },
          { coinflipPlayerControl: { status: 'BANNED' } },
        ],
      });
    } else if (mod === 'LIMITED') {
      and.push({
        NOT: {
          OR: [
            { dicePlayerControl: { status: 'BANNED' } },
            { minesPlayerControl: { status: 'BANNED' } },
            { crashPlayerControl: { status: 'BANNED' } },
            { coinflipPlayerControl: { status: 'BANNED' } },
          ],
        },
      });
      and.push({
        OR: [
          { dicePlayerControl: { status: 'LIMITED' } },
          { minesPlayerControl: { status: 'LIMITED' } },
          { crashPlayerControl: { status: 'LIMITED' } },
          { coinflipPlayerControl: { status: 'LIMITED' } },
        ],
      });
    } else if (mod === 'ACTIVE') {
      and.push({
        NOT: { dicePlayerControl: { status: { in: ['LIMITED', 'BANNED'] } } },
      });
      and.push({
        NOT: { minesPlayerControl: { status: { in: ['LIMITED', 'BANNED'] } } },
      });
      and.push({
        NOT: { crashPlayerControl: { status: { in: ['LIMITED', 'BANNED'] } } },
      });
      and.push({
        NOT: {
          coinflipPlayerControl: { status: { in: ['LIMITED', 'BANNED'] } },
        },
      });
    }
    if (and.length === 0) {
      return {};
    }
    return { AND: and };
  }

  private buildOrderBy(
    criteria: AdminUserListCriteria,
  ): Prisma.UserOrderByWithRelationInput {
    const dir = criteria.order;
    switch (criteria.sort) {
      case 'balance':
        return { balance: dir };
      case 'wager':
        return { statistics: { totalWagered: dir } };
      default:
        return { created_at: dir };
    }
  }

  private toSummary(
    row: {
      id: string;
      username: string;
      balance: Prisma.Decimal;
      role: UserRoles;
      created_at: Date;
      last_login_at: Date | null;
      last_login_ip: string | null;
      last_known_ip: string | null;
      last_user_agent: string | null;
      last_device: string | null;
      geo_country: string | null;
      geo_city: string | null;
      geo_timezone: string | null;
      last_active_at: Date | null;
      login_count: number;
      ip_history: string[];
      device_history: string[];
      device_fingerprint: string | null;
      is_vpn: boolean | null;
      is_proxy: boolean | null;
      totalXP: number;
      currentLevel: number;
      statistics: { totalWagered: Prisma.Decimal } | null;
      dicePlayerControl: { status: 'ACTIVE' | 'LIMITED' | 'BANNED' } | null;
      minesPlayerControl: { status: 'ACTIVE' | 'LIMITED' | 'BANNED' } | null;
      crashPlayerControl: { status: 'ACTIVE' | 'LIMITED' | 'BANNED' } | null;
      coinflipPlayerControl: { status: 'ACTIVE' | 'LIMITED' | 'BANNED' } | null;
    },
    activeWithinDays: number,
    totalWageredFromHistory: Prisma.Decimal,
  ): AdminUserSummary {
    const wager = totalWageredFromHistory;
    const status: AdminUserStatus = deriveAdminUserStatus(
      row.last_login_at,
      activeWithinDays,
    );
    const moderation_status = deriveModerationStatus(
      row.dicePlayerControl,
      row.minesPlayerControl,
      row.crashPlayerControl,
      row.coinflipPlayerControl,
    );
    return {
      id: row.id,
      username: row.username,
      email: null,
      first_name: null,
      last_name: null,
      balance: row.balance.toFixed(2),
      total_wagered: wager.toFixed(2),
      total_xp: row.totalXP,
      current_level: row.currentLevel,
      role: row.role,
      status,
      moderation_status,
      created_at: row.created_at,
      last_login: row.last_login_at,
      last_login_ip: row.last_login_ip,
      last_known_ip: row.last_known_ip,
      last_user_agent: row.last_user_agent,
      last_device: row.last_device,
      geo_country: row.geo_country,
      geo_city: row.geo_city,
      geo_timezone: row.geo_timezone,
      last_active_at: row.last_active_at,
      login_count: row.login_count,
      ip_history: [...row.ip_history],
      device_history: [...row.device_history],
      device_fingerprint: row.device_fingerprint,
      is_vpn: row.is_vpn,
      is_proxy: row.is_proxy,
      chat_ban: emptyChatBanInfo(),
    };
  }
}
