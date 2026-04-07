import { Inject, Injectable } from '@nestjs/common';
import type { IRacesRepository } from '../domain/races.repository.port';
import { RACES_REPOSITORY } from '../infrastructure/races.tokens';
import { RaceLeaderboardRedisRepository } from '../infrastructure/race-leaderboard.redis.repository';

@Injectable()
export class PauseTrackingUseCase {
  constructor(
    @Inject(RACES_REPOSITORY) private readonly races: IRacesRepository,
    private readonly leaderboardRedis: RaceLeaderboardRedisRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.races.setTrackingPaused(id, true);
    await this.leaderboardRedis.deleteCurrentRaceKeyOnly();
  }
}
