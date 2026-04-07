import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { StaffPrincipal } from '../../auth/presentation/staff-principal';
import { ChatBanService } from '../../chat-ban/chat-ban.service';
import { PrismaService } from '../../prisma/prisma.service';
import { emptyChatBanInfo } from '../domain/admin-user-summary';
import type { IAdminUserReadRepository } from '../domain/admin-user-read.repository';
import { ADMIN_USER_READ_REPOSITORY } from '../infrastructure/admin-user.tokens';
import { AdminAuditLogService } from '../infrastructure/admin-audit-log.service';
import { AdminGameUserCacheInvalidator } from '../infrastructure/admin-game-user-cache.invalidator';
import type { UpdateAdminGameUserBodyDto } from '../presentation/dto/update-admin-game-user.body.dto';

const ACTIVE_WITHIN_DAYS_FOR_REFRESH = 90;

@Injectable()
export class UpdateAdminGameUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
    @Inject(ADMIN_USER_READ_REPOSITORY)
    private readonly users: IAdminUserReadRepository,
    private readonly chatBan: ChatBanService,
    private readonly gameUserCache: AdminGameUserCacheInvalidator,
  ) {}

  async execute(
    usernameRaw: string,
    body: UpdateAdminGameUserBodyDto,
    staff: StaffPrincipal,
  ) {
    const username = usernameRaw?.trim();
    if (!username) {
      throw new BadRequestException('username required');
    }

    if (body.balanceSet != null && body.balanceDelta != null) {
      throw new BadRequestException('Use either balanceSet or balanceDelta, not both.');
    }
    if (body.totalWageredSet != null && body.totalWageredDelta != null) {
      throw new BadRequestException(
        'Use either totalWageredSet or totalWageredDelta, not both.',
      );
    }
    if (body.totalXP != null && body.totalXPDelta != null) {
      throw new BadRequestException('Use either totalXP or totalXPDelta, not both.');
    }

    const hasChange =
      body.balanceSet != null ||
      body.balanceDelta != null ||
      body.totalWageredSet != null ||
      body.totalWageredDelta != null ||
      body.role != null ||
      body.totalXP != null ||
      body.totalXPDelta != null ||
      body.currentLevel != null;

    if (!hasChange) {
      throw new BadRequestException('No fields to update.');
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        balance: true,
        role: true,
        statistics: { select: { totalWagered: true, userUsername: true } },
        totalXP: true,
        currentLevel: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const balanceUpdates: { balance: Prisma.Decimal } = { balance: user.balance };
    if (body.balanceSet != null) {
      const set = new Prisma.Decimal(body.balanceSet.trim());
      if (set.lt(0)) {
        throw new BadRequestException('balanceSet must be >= 0');
      }
      balanceUpdates.balance = set;
    } else if (body.balanceDelta != null) {
      const delta = new Prisma.Decimal(body.balanceDelta.trim());
      const next = user.balance.add(delta);
      if (next.lt(0)) {
        throw new BadRequestException('Balance would become negative.');
      }
      balanceUpdates.balance = next;
    }

    const userData: Prisma.UserUpdateInput = {};
    if (body.balanceSet != null || body.balanceDelta != null) {
      userData.balance = balanceUpdates.balance;
    }
    if (body.role != null) {
      userData.role = body.role;
    }
    if (body.totalXP != null) {
      userData.totalXP = body.totalXP;
    }
    if (body.totalXPDelta != null) {
      const nextXp = user.totalXP + body.totalXPDelta;
      if (!Number.isFinite(nextXp) || nextXp < 0) {
        throw new BadRequestException('XP would become negative.');
      }
      if (nextXp > 999_999_999) {
        throw new BadRequestException('XP would exceed maximum (999_999_999).');
      }
      userData.totalXP = nextXp;
    }
    if (body.currentLevel != null) {
      userData.currentLevel = body.currentLevel;
    }

    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { username },
        data: userData,
      });
    }

    if (body.totalWageredSet != null) {
      const w = new Prisma.Decimal(body.totalWageredSet.trim());
      if (w.lt(0)) {
        throw new BadRequestException('totalWageredSet must be >= 0');
      }
      await this.prisma.userStatistics.upsert({
        where: { userUsername: username },
        create: {
          userUsername: username,
          totalWagered: w,
        },
        update: { totalWagered: w },
      });
    } else if (body.totalWageredDelta != null) {
      const current = user.statistics?.totalWagered ?? new Prisma.Decimal(0);
      const delta = new Prisma.Decimal(body.totalWageredDelta.trim());
      const next = current.add(delta);
      if (next.lt(0)) {
        throw new BadRequestException('Total wagered would become negative.');
      }
      await this.prisma.userStatistics.upsert({
        where: { userUsername: username },
        create: {
          userUsername: username,
          totalWagered: next,
        },
        update: { totalWagered: next },
      });
    }

    await this.gameUserCache.invalidate(username, {
      balance: body.balanceSet != null || body.balanceDelta != null,
      profileOrProgress:
        body.role != null ||
        body.totalXP != null ||
        body.totalXPDelta != null ||
        body.currentLevel != null,
      wagerStats:
        body.totalWageredSet != null || body.totalWageredDelta != null,
    });

    await this.audit.log({
      staff,
      action: 'user.update_fields',
      targetUsername: username,
      targetUserId: user.id,
      payload: {
        before: {
          balance: user.balance.toFixed(2),
          role: user.role,
          totalWagered:
            user.statistics?.totalWagered?.toFixed(2) ?? null,
          totalXP: user.totalXP,
          currentLevel: user.currentLevel,
        },
        request: body,
      },
    });

    const summary = await this.users.findSummaryByUsername(
      username,
      ACTIVE_WITHIN_DAYS_FOR_REFRESH,
    );
    if (!summary) {
      throw new NotFoundException('User not found after update');
    }
    const banMap = await this.chatBan.getBanStatusMapForUsernames([
      summary.username,
    ]);
    return {
      ok: true as const,
      user: {
        ...summary,
        chat_ban: banMap.get(summary.username) ?? emptyChatBanInfo(),
      },
    };
  }
}
