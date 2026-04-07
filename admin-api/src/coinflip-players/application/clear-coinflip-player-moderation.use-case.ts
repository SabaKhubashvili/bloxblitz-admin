import { Injectable, NotFoundException } from '@nestjs/common';
import { CoinflipBannedUserIdsRedisService } from '../../coinflip-banned-user-ids/coinflip-banned-user-ids.redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CoinflipPlayerModerationRedisSync } from '../infrastructure/coinflip-player-moderation-redis.sync';

@Injectable()
export class ClearCoinflipPlayerModerationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisSync: CoinflipPlayerModerationRedisSync,
    private readonly bannedUserIds: CoinflipBannedUserIdsRedisService,
  ) {}

  async execute(username: string): Promise<{ ok: true; changed: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await this.prisma.coinflipPlayerControl.deleteMany({
      where: { userUsername: username },
    });

    await this.redisSync.removeBan(username);
    await this.redisSync.clearLimitFields(username);
    await this.bannedUserIds.removeBannedUsername(username);

    return { ok: true, changed: result.count > 0 };
  }
}
