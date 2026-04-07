import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { IRacesRepository } from '../domain/races.repository.port';
import { RACES_REPOSITORY } from '../infrastructure/races.tokens';
import { RaceLeaderboardRedisRepository } from '../infrastructure/race-leaderboard.redis.repository';

/**
 * Promotes scheduled races whose start time has passed and finalizes expired
 * live races — keeps admin API authoritative when no worker runs on the game API.
 */
@Injectable()
export class RaceLifecycleCron {
  private readonly log = new Logger(RaceLifecycleCron.name);

  constructor(
    @Inject(RACES_REPOSITORY) private readonly races: IRacesRepository,
    private readonly leaderboardRedis: RaceLeaderboardRedisRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    const now = new Date();
    try {
      const n = await this.races.promoteDueScheduledRaces(now);
      if (n > 0) {
        await this.leaderboardRedis.deleteCurrentRaceKeyOnly();
      }
    } catch (e) {
      this.log.warn('[RaceLifecycle] promote failed', e);
    }

    try {
      const finishedIds = await this.races.finishExpiredActiveRaces(now);
      for (const id of finishedIds) {
        await this.leaderboardRedis.invalidateAmpCompatibleRaceCaches(id);
      }
    } catch (e) {
      this.log.warn('[RaceLifecycle] auto-finish failed', e);
    }
  }
}
