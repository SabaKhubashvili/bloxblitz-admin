import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CoinflipPlayerControlStatus,
  CrashPlayerControlStatus,
  DicePlayerControlStatus,
  MinesPlayerControlStatus,
  Prisma,
} from '@prisma/client';
import type { StaffPrincipal } from '../../auth/presentation/staff-principal';
import { CoinflipBannedUserIdsRedisService } from '../../coinflip-banned-user-ids/coinflip-banned-user-ids.redis.service';
import { CoinflipPlayerModerationRedisSync } from '../../coinflip-players/infrastructure/coinflip-player-moderation-redis.sync';
import { CrashBetEligibilityCacheService } from '../../crash-players/infrastructure/crash-bet-eligibility-cache.service';
import { DicePlayerControlRedisService } from '../../dice-analytics/infrastructure/dice-player-control.redis.service';
import { MinesPlayerControlRedisService } from '../../mines-moderation/infrastructure/mines-player-control.redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditLogService } from '../infrastructure/admin-audit-log.service';
import type { GlobalUserModerationBodyDto } from '../presentation/dto/global-user-moderation.body.dto';
import { GlobalUserModerationActionDto } from '../presentation/dto/global-user-moderation.body.dto';

/** Coinflip JSON ban list requires a future `until` — use far-future for indefinite admin bans. */
const COINFLIP_INDEFINITE_BAN_UNTIL = '2099-12-31T23:59:59.000Z';

@Injectable()
export class GlobalUserModerationUseCase {
  private readonly log = new Logger(GlobalUserModerationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
    private readonly diceRedis: DicePlayerControlRedisService,
    private readonly minesRedis: MinesPlayerControlRedisService,
    private readonly coinflipRedis: CoinflipPlayerModerationRedisSync,
    private readonly coinflipBannedIds: CoinflipBannedUserIdsRedisService,
    private readonly crashEligCache: CrashBetEligibilityCacheService,
  ) {}

  async execute(
    usernameRaw: string,
    body: GlobalUserModerationBodyDto,
    staff: StaffPrincipal,
  ): Promise<{ ok: true }> {
    const username = usernameRaw?.trim();
    if (!username) {
      throw new BadRequestException('username required');
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        id: true,
        dicePlayerControl: { select: { status: true } },
        minesPlayerControl: { select: { status: true } },
        crashPlayerControl: { select: { status: true } },
        coinflipPlayerControl: { select: { status: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const note = body.note?.trim().slice(0, 500) || null;

    switch (body.action) {
      case GlobalUserModerationActionDto.BAN:
        await this.banAll(user.username, note, staff);
        break;
      case GlobalUserModerationActionDto.UNBAN:
        await this.unbanAll(user.username, staff);
        break;
      case GlobalUserModerationActionDto.LIMIT:
        await this.limitAll(user.username, body, staff);
        break;
      case GlobalUserModerationActionDto.UNLIMIT:
        await this.unlimitAll(user.username, staff);
        break;
      default:
        throw new BadRequestException('Unknown action');
    }

    return { ok: true };
  }

  private async banAll(
    username: string,
    note: string | null,
    staff: StaffPrincipal,
  ): Promise<void> {
    const diceRow = await this.prisma.dicePlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: DicePlayerControlStatus.BANNED,
        maxBetAmount: null,
        note,
      },
      update: {
        status: DicePlayerControlStatus.BANNED,
        maxBetAmount: null,
        note,
      },
    });
    await this.diceRedis.writeFromRow(diceRow);
    await this.diceRedis.bumpPlayersListCache();

    const minesRow = await this.prisma.minesPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: MinesPlayerControlStatus.BANNED,
        maxBetAmount: null,
        maxGamesPerHour: null,
        note,
      },
      update: {
        status: MinesPlayerControlStatus.BANNED,
        maxBetAmount: null,
        maxGamesPerHour: null,
        note,
      },
    });
    await this.minesRedis.writeFromRow(minesRow);

    try {
      await this.prisma.crashPlayerControl.upsert({
        where: { userUsername: username },
        create: {
          userUsername: username,
          status: CrashPlayerControlStatus.BANNED,
          maxBetAmount: null,
          minSecondsBetweenBets: null,
          note,
        },
        update: {
          status: CrashPlayerControlStatus.BANNED,
          maxBetAmount: null,
          minSecondsBetweenBets: null,
          note: note ?? undefined,
        },
      });
    } finally {
      await this.crashEligCache.invalidate(username).catch(() => {});
    }

    const reason = note ?? 'Global admin ban';
    await this.prisma.coinflipPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: CoinflipPlayerControlStatus.BANNED,
        maxWagerAmount: null,
        maxGamesPerHour: null,
        note: note,
      },
      update: {
        status: CoinflipPlayerControlStatus.BANNED,
        maxWagerAmount: null,
        maxGamesPerHour: null,
        note,
      },
    });
    await this.coinflipRedis.clearLimitFields(username);
    await this.coinflipRedis.addBan(username, reason, COINFLIP_INDEFINITE_BAN_UNTIL);
    await this.coinflipBannedIds.addBannedUsername(username);

    await this.audit.log({
      staff,
      action: 'user.global_ban',
      targetUsername: username,
      payload: { note },
    });
    this.log.log(`[AUDIT] user.global_ban username=${username} staff=${staff.email}`);
  }

  private async unbanAll(username: string, staff: StaffPrincipal): Promise<void> {
    const diceRow = await this.prisma.dicePlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (diceRow?.status === DicePlayerControlStatus.BANNED) {
      await this.prisma.dicePlayerControl.delete({
        where: { userUsername: username },
      });
      await this.diceRedis.remove(username);
      await this.diceRedis.bumpPlayersListCache();
    }

    const minesRow = await this.prisma.minesPlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (minesRow?.status === MinesPlayerControlStatus.BANNED) {
      await this.prisma.minesPlayerControl.delete({
        where: { userUsername: username },
      });
      await this.minesRedis.remove(username);
    }

    try {
      const crashRow = await this.prisma.crashPlayerControl.findUnique({
        where: { userUsername: username },
      });
      if (crashRow?.status === CrashPlayerControlStatus.BANNED) {
        await this.prisma.crashPlayerControl.deleteMany({
          where: { userUsername: username },
        });
      }
    } finally {
      await this.crashEligCache.invalidate(username).catch(() => {});
    }

    const cfRow = await this.prisma.coinflipPlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (cfRow?.status === CoinflipPlayerControlStatus.BANNED) {
      await this.prisma.coinflipPlayerControl.update({
        where: { userUsername: username },
        data: {
          status: CoinflipPlayerControlStatus.ACTIVE,
          maxWagerAmount: null,
          maxGamesPerHour: null,
          note: null,
        },
      });
      await this.coinflipRedis.removeBan(username);
      await this.coinflipBannedIds.removeBannedUsername(username);
      await this.coinflipRedis.clearLimitFields(username);
    }

    await this.audit.log({
      staff,
      action: 'user.global_unban',
      targetUsername: username,
      payload: {},
    });
    this.log.log(`[AUDIT] user.global_unban username=${username} staff=${staff.email}`);
  }

  private async assertNoneBanned(username: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        dicePlayerControl: { select: { status: true } },
        minesPlayerControl: { select: { status: true } },
        crashPlayerControl: { select: { status: true } },
        coinflipPlayerControl: { select: { status: true } },
      },
    });
    const bannedGames: string[] = [];
    if (user?.dicePlayerControl?.status === DicePlayerControlStatus.BANNED) {
      bannedGames.push('dice');
    }
    if (user?.minesPlayerControl?.status === MinesPlayerControlStatus.BANNED) {
      bannedGames.push('mines');
    }
    if (user?.crashPlayerControl?.status === CrashPlayerControlStatus.BANNED) {
      bannedGames.push('crash');
    }
    if (user?.coinflipPlayerControl?.status === CoinflipPlayerControlStatus.BANNED) {
      bannedGames.push('coinflip');
    }
    if (bannedGames.length > 0) {
      throw new ConflictException(
        `User is banned from: ${bannedGames.join(', ')}. Use global unban (or per-game unban) before applying limits.`,
      );
    }
  }

  private async limitAll(
    username: string,
    body: GlobalUserModerationBodyDto,
    staff: StaffPrincipal,
  ): Promise<void> {
    const maxBet = body.maxBetAmount;
    if (maxBet == null || !Number.isFinite(maxBet) || maxBet <= 0) {
      throw new BadRequestException(
        'maxBetAmount is required for global LIMIT (positive number).',
      );
    }
    const rounded = Math.round(maxBet * 100) / 100;
    const betDec = new Prisma.Decimal(rounded.toFixed(2));
    const hourly =
      body.maxGamesPerHour != null && body.maxGamesPerHour > 0
        ? Math.floor(body.maxGamesPerHour)
        : null;
    const note = body.note?.trim().slice(0, 500) || null;

    await this.assertNoneBanned(username);

    const diceRow = await this.prisma.dicePlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: DicePlayerControlStatus.LIMITED,
        maxBetAmount: betDec,
        note,
      },
      update: {
        status: DicePlayerControlStatus.LIMITED,
        maxBetAmount: betDec,
        note,
      },
    });
    await this.diceRedis.writeFromRow(diceRow);
    await this.diceRedis.bumpPlayersListCache();

    const minesRow = await this.prisma.minesPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: MinesPlayerControlStatus.LIMITED,
        maxBetAmount: betDec,
        maxGamesPerHour: hourly,
        note,
      },
      update: {
        status: MinesPlayerControlStatus.LIMITED,
        maxBetAmount: betDec,
        maxGamesPerHour: hourly,
        note,
      },
    });
    await this.minesRedis.writeFromRow(minesRow);

    try {
      await this.prisma.crashPlayerControl.upsert({
        where: { userUsername: username },
        create: {
          userUsername: username,
          status: CrashPlayerControlStatus.LIMITED,
          maxBetAmount: betDec,
          minSecondsBetweenBets: null,
          note,
        },
        update: {
          status: CrashPlayerControlStatus.LIMITED,
          maxBetAmount: betDec,
          note: note ?? undefined,
        },
      });
    } finally {
      await this.crashEligCache.invalidate(username).catch(() => {});
    }

    await this.prisma.coinflipPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: CoinflipPlayerControlStatus.LIMITED,
        maxWagerAmount: betDec,
        maxGamesPerHour: hourly,
        note,
      },
      update: {
        status: CoinflipPlayerControlStatus.LIMITED,
        maxWagerAmount: betDec,
        maxGamesPerHour: hourly,
        note,
      },
    });
    const cents = Math.round(betDec.toNumber() * 100);
    await this.coinflipRedis.setMaxBetCents(username, cents);
    if (hourly != null) {
      await this.coinflipRedis.setMaxGamesPerHourField(username, hourly);
    }

    await this.audit.log({
      staff,
      action: 'user.global_limit',
      targetUsername: username,
      payload: {
        maxBetAmount: rounded,
        maxGamesPerHour: hourly,
        note,
      },
    });
    this.log.log(
      `[AUDIT] user.global_limit username=${username} staff=${staff.email} maxBet=${rounded}`,
    );
  }

  private async unlimitAll(username: string, staff: StaffPrincipal): Promise<void> {
    const diceRow = await this.prisma.dicePlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (diceRow?.status === DicePlayerControlStatus.LIMITED) {
      await this.prisma.dicePlayerControl.delete({
        where: { userUsername: username },
      });
      await this.diceRedis.remove(username);
      await this.diceRedis.bumpPlayersListCache();
    }

    const minesRow = await this.prisma.minesPlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (minesRow?.status === MinesPlayerControlStatus.LIMITED) {
      await this.prisma.minesPlayerControl.delete({
        where: { userUsername: username },
      });
      await this.minesRedis.remove(username);
    }

    try {
      const crashRow = await this.prisma.crashPlayerControl.findUnique({
        where: { userUsername: username },
      });
      if (crashRow?.status === CrashPlayerControlStatus.LIMITED) {
        await this.prisma.crashPlayerControl.deleteMany({
          where: { userUsername: username },
        });
      }
    } finally {
      await this.crashEligCache.invalidate(username).catch(() => {});
    }

    const cfRow = await this.prisma.coinflipPlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (cfRow?.status === CoinflipPlayerControlStatus.LIMITED) {
      await this.prisma.coinflipPlayerControl.deleteMany({
        where: { userUsername: username },
      });
      await this.coinflipRedis.clearLimitFields(username);
    }

    await this.audit.log({
      staff,
      action: 'user.global_unlimit',
      targetUsername: username,
      payload: {},
    });
    this.log.log(`[AUDIT] user.global_unlimit username=${username} staff=${staff.email}`);
  }
}
