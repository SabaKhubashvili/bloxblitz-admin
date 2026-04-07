import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoinflipBannedUserIdsRedisService } from './coinflip-banned-user-ids.redis.service';

@Injectable()
export class CoinflipBannedUsersBootstrapService implements OnModuleInit {
  private readonly log = new Logger(CoinflipBannedUsersBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bannedIds: CoinflipBannedUserIdsRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.bannedIds.rebuildFromPersistence(this.prisma);
    } catch (e) {
      this.log.error(
        `Failed to warm coinflip:banned:users (by username): ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
