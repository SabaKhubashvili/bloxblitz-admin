import type { Prisma, RaceStatus } from '@prisma/client';

export type RaceWindowLabel = '24h' | '7d' | 'custom';

export interface RaceEntity {
  id: string;
  startTime: Date;
  endTime: Date;
  status: RaceStatus;
  totalPrizePool: Prisma.Decimal | null;
  trackingPaused: boolean;
  raceWindow: string | null;
}

export interface RaceTotals {
  totalWagered: Prisma.Decimal;
  participants: number;
}

export interface LeaderboardRow {
  username: string;
  wagered: number;
  rank: number;
}

export interface IRacesRepository {
  findLiveRace(now: Date): Promise<RaceEntity | null>;
  findNextScheduledExcluding(
    excludeRaceId: string | undefined,
    now: Date,
  ): Promise<RaceEntity | null>;
  findAnyScheduled(now: Date): Promise<RaceEntity | null>;
  getTotalsForRace(raceId: string): Promise<RaceTotals>;
  findOverlappingRace(
    startTime: Date,
    endTime: Date,
    ignoreRaceId?: string,
  ): Promise<RaceEntity | null>;
  createRace(input: {
    startTime: Date;
    endTime: Date;
    raceWindow: string | null;
    rewards: Array<{ position: number; rewardAmount: Prisma.Decimal }>;
  }): Promise<RaceEntity>;
  listRaceRewards(
    raceId: string,
  ): Promise<Array<{ position: number; rewardAmount: Prisma.Decimal }>>;
  findById(id: string): Promise<RaceEntity | null>;
  finishRace(id: string): Promise<void>;
  cancelRace(id: string): Promise<void>;
  setPaused(id: string, paused: boolean): Promise<void>;
  setTrackingPaused(id: string, paused: boolean): Promise<void>;
  listTerminalRaces(limit: number): Promise<RaceEntity[]>;
  winnersForHistory(raceId: string, status: RaceStatus): Promise<LeaderboardRow[]>;
  findLeaderboardTopDb(raceId: string, limit: number): Promise<LeaderboardRow[]>;
  promoteDueScheduledRaces(now: Date): Promise<number>;
  finishExpiredActiveRaces(now: Date): Promise<string[]>;
}
