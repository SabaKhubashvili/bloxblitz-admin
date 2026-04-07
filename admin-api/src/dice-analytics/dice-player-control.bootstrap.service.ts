import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DicePlayerControlRedisService } from './infrastructure/dice-player-control.redis.service';

@Injectable()
export class DicePlayerControlBootstrapService implements OnModuleInit {
  private readonly log = new Logger(DicePlayerControlBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly diceControlRedis: DicePlayerControlRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.diceControlRedis.rebuildFromPersistence(this.prisma);
    } catch (e) {
      this.log.error(
        `Failed to warm Dice moderation Redis cache: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
