import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CoinflipFraudRedisRepository } from './coinflip-fraud.redis-repository';
import {
  DECAY_PERSISTENT_PER_TICK,
  DECAY_TEMP_PER_TICK,
} from '../domain/coinflip-fraud.thresholds';
import { CoinflipFraudGraphAnalysisService } from '../application/coinflip-fraud-graph-analysis.service';

@Injectable()
export class CoinflipFraudScheduledWorker {
  private readonly log = new Logger(CoinflipFraudScheduledWorker.name);

  constructor(
    private readonly redis: CoinflipFraudRedisRepository,
    private readonly graph: CoinflipFraudGraphAnalysisService,
  ) {}

  /** Every 2 minutes — decay stale risk components + keep ZSETs bounded implicitly via writes. */
  @Cron('*/2 * * * *')
  async applyDecay(): Promise<void> {
    try {
      await this.redis.applyDecayToMonitoredUsers(
        DECAY_TEMP_PER_TICK,
        DECAY_PERSISTENT_PER_TICK,
      );
    } catch (e) {
      this.log.warn(`fraud decay: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Every 8 minutes — heavier circulation / cluster heuristics (still bounded). */
  @Cron('*/8 * * * *')
  async graphPass(): Promise<void> {
    try {
      await this.graph.runMoneyFlowAndClusterPass();
    } catch (e) {
      this.log.warn(`fraud graph: ${e instanceof Error ? e.message : e}`);
    }
  }
}
