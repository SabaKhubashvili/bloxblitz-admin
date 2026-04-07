import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { assertValidRaceRewardTiers } from '../domain/race-reward-tiers.validation';
import type { IRacesRepository } from '../domain/races.repository.port';
import { RACES_REPOSITORY } from '../infrastructure/races.tokens';
import { RaceLeaderboardRedisRepository } from '../infrastructure/race-leaderboard.redis.repository';
import { resolveRaceWindow } from './race-window.util';

export type CreateRaceRewardTierInput = {
  position: number;
  rewardAmount: number;
};

export type CreateRaceInput = {
  rewards: CreateRaceRewardTierInput[];
  startTime: string;
  endTime: string;
  raceWindow?: '24h' | '7d' | 'custom';
};

@Injectable()
export class CreateRaceUseCase {
  constructor(
    @Inject(RACES_REPOSITORY) private readonly races: IRacesRepository,
    private readonly leaderboardRedis: RaceLeaderboardRedisRepository,
  ) {}

  async execute(input: CreateRaceInput): Promise<{ id: string }> {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid startTime or endTime');
    }
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    assertValidRaceRewardTiers(input.rewards);

    const overlapping = await this.races.findOverlappingRace(startTime, endTime);
    if (overlapping) {
      throw new ConflictException(
        'Another scheduled or live race overlaps this time range',
      );
    }

    const label = resolveRaceWindow(startTime, endTime, input.raceWindow);

    const decimals = input.rewards
      .map((r) => ({
        position: r.position,
        rewardAmount: new Prisma.Decimal(r.rewardAmount),
      }))
      .sort((a, b) => a.position - b.position);

    const created = await this.races.createRace({
      startTime,
      endTime,
      raceWindow: label,
      rewards: decimals,
    });

    await this.leaderboardRedis.deleteCurrentRaceKeyOnly();

    return { id: created.id };
  }
}
