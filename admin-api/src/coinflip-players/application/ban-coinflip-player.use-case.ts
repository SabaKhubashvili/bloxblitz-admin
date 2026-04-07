import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoinflipPlayerControlStatus } from '@prisma/client';
import { CoinflipBannedUserIdsRedisService } from '../../coinflip-banned-user-ids/coinflip-banned-user-ids.redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CoinflipPlayerModerationRedisSync } from '../infrastructure/coinflip-player-moderation-redis.sync';

@Injectable()
export class BanCoinflipPlayerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisSync: CoinflipPlayerModerationRedisSync,
    private readonly bannedUserIds: CoinflipBannedUserIdsRedisService,
  ) {}

  async execute(
    username: string,
    args: { reason: string; untilIso: string },
  ): Promise<{ ok: true; alreadyBanned: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const untilMs = new Date(args.untilIso).getTime();
    if (!Number.isFinite(untilMs) || untilMs <= Date.now()) {
      throw new BadRequestException('untilIso must be a future UTC instant.');
    }

    const existing = await this.prisma.coinflipPlayerControl.findUnique({
      where: { userUsername: username },
    });

    if (existing?.status === CoinflipPlayerControlStatus.BANNED) {
      await this.bannedUserIds.addBannedUsername(username);
      return { ok: true, alreadyBanned: true };
    }

    await this.prisma.coinflipPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: CoinflipPlayerControlStatus.BANNED,
        maxWagerAmount: null,
        maxGamesPerHour: null,
        note: args.reason.trim().slice(0, 500) || null,
      },
      update: {
        status: CoinflipPlayerControlStatus.BANNED,
        maxWagerAmount: null,
        maxGamesPerHour: null,
        note: args.reason.trim().slice(0, 500) || null,
      },
    });

    await this.redisSync.clearLimitFields(username);
    await this.redisSync.addBan(username, args.reason, args.untilIso);
    await this.bannedUserIds.addBannedUsername(username);

    return { ok: true, alreadyBanned: false };
  }
}
