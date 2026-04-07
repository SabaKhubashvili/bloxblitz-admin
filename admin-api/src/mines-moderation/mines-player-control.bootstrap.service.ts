import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinesPlayerControlRedisService } from './infrastructure/mines-player-control.redis.service';

@Injectable()
export class MinesPlayerControlBootstrapService implements OnModuleInit {
  private readonly log = new Logger(MinesPlayerControlBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minesControlRedis: MinesPlayerControlRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.minesControlRedis.rebuildFromPersistence(this.prisma);
    } catch (e) {
      this.log.error(
        `Failed to warm Mines moderation Redis cache: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
