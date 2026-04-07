import { Inject, Injectable } from '@nestjs/common';
import { RaceStatus } from '@prisma/client';
import type { IRacesRepository } from '../domain/races.repository.port';
import { RACES_REPOSITORY } from '../infrastructure/races.tokens';
import { RaceLeaderboardRedisRepository } from '../infrastructure/race-leaderboard.redis.repository';
import { resolveRaceWindow } from './race-window.util';

export type RaceRewardTierDto = {
  position: number;
  rewardAmount: number;
};

export type RaceOverviewActiveDto = {
  id: string;
  prizePool: number;
  totalWagered: number;
  participants: number;
  timeLeft: number;
  startTime: string;
  endTime: string;
  status: 'active' | 'paused';
  trackingPaused: boolean;
  raceWindow: '24h' | '7d' | 'custom';
  /** Per-position prize rows (matches `RaceReward`). */
  rewardTiers: RaceRewardTierDto[];
};

export type RaceOverviewNextDto = {
  id: string;
  prizePool: number;
  startTime: string;
  endTime: string;
  rewardTiers: RaceRewardTierDto[];
};

export type RaceOverviewTopEntry = {
  username: string;
  wagered: number;
  rank: number;
};

export type RaceOverviewResult = {
  activeRace: RaceOverviewActiveDto | null;
  top10: RaceOverviewTopEntry[];
  nextRace?: RaceOverviewNextDto;
};

@Injectable()
export class GetRaceOverviewUseCase {
  constructor(
    @Inject(RACES_REPOSITORY) private readonly races: IRacesRepository,
    private readonly leaderboardRedis: RaceLeaderboardRedisRepository,
  ) {}

  async execute(): Promise<RaceOverviewResult> {
    const now = new Date();
    await this.races.promoteDueScheduledRaces(now);
    const live = await this.races.findLiveRace(now);
    const next = await this.races.findNextScheduledExcluding(
      live?.id,
      now,
    );

    if (!live) {
      const upcoming =
        next ??
        (await this.races.findAnyScheduled(now));
      const top10: RaceOverviewTopEntry[] = [];
      let nextRace: RaceOverviewNextDto | undefined;
      if (upcoming) {
        const tierRows = await this.races.listRaceRewards(upcoming.id);
        nextRace = {
          id: upcoming.id,
          prizePool: Number(upcoming.totalPrizePool ?? 0),
          startTime: upcoming.startTime.toISOString(),
          endTime: upcoming.endTime.toISOString(),
          rewardTiers: tierRows.map((r) => ({
            position: r.position,
            rewardAmount: Number(r.rewardAmount),
          })),
        };
      }

      return {
        activeRace: null,
        top10,
        ...(nextRace ? { nextRace } : {}),
      };
    }

    const totals = await this.races.getTotalsForRace(live.id);
    const timeLeftSec = Math.max(
      0,
      Math.floor((live.endTime.getTime() - now.getTime()) / 1000),
    );

    const tierRowsLive = await this.races.listRaceRewards(live.id);
    const rewardTiersLive: RaceRewardTierDto[] = tierRowsLive.map((r) => ({
      position: r.position,
      rewardAmount: Number(r.rewardAmount),
    }));

    const redisTop = await this.leaderboardRedis.top10FromRedis(live.id);
    const top10 =
      redisTop ??
      (await this.races.findLeaderboardTopDb(live.id, 10));

    const raceWindow = resolveRaceWindow(
      live.startTime,
      live.endTime,
      live.raceWindow ?? undefined,
    );

    const activeRace: RaceOverviewActiveDto = {
      id: live.id,
      prizePool: Number(live.totalPrizePool ?? 0),
      totalWagered: Number(totals.totalWagered),
      participants: totals.participants,
      timeLeft: timeLeftSec,
      startTime: live.startTime.toISOString(),
      endTime: live.endTime.toISOString(),
      status: live.status === RaceStatus.PAUSED ? 'paused' : 'active',
      trackingPaused: live.trackingPaused,
      raceWindow,
      rewardTiers: rewardTiersLive,
    };

    let nextRace: RaceOverviewNextDto | undefined;
    if (next) {
      const tierRowsNext = await this.races.listRaceRewards(next.id);
      nextRace = {
        id: next.id,
        prizePool: Number(next.totalPrizePool ?? 0),
        startTime: next.startTime.toISOString(),
        endTime: next.endTime.toISOString(),
        rewardTiers: tierRowsNext.map((r) => ({
          position: r.position,
          rewardAmount: Number(r.rewardAmount),
        })),
      };
    }

    return {
      activeRace,
      top10,
      ...(nextRace ? { nextRace } : {}),
    };
  }
}
