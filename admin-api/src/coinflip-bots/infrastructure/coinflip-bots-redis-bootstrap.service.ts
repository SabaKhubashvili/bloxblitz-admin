import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CoinflipBotsAdminService } from '../application/coinflip-bots-admin.service';

@Injectable()
export class CoinflipBotsRedisBootstrapService implements OnModuleInit {
  private readonly log = new Logger(CoinflipBotsRedisBootstrapService.name);

  constructor(private readonly coinflipBots: CoinflipBotsAdminService) {}

  async onModuleInit(): Promise<void> {
    try {
      const n = await this.coinflipBots.syncAllBotsToRedis();
      this.log.log(`Coinflip bots Redis warm complete (${n} in cache).`);
    } catch (e) {
      this.log.warn(
        `Coinflip bots Redis warm skipped: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}
