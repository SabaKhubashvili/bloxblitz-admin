import { Inject, Injectable } from '@nestjs/common';
import { RaceStatus } from '@prisma/client';
import type { IRacesRepository } from '../domain/races.repository.port';
import { RACES_REPOSITORY } from '../infrastructure/races.tokens';

export type RaceHistoryItemDto = {
  id: string;
  prizePool: number;
  totalWagered: number;
  participants: number;
  startTime: string;
  endTime: string;
  status: 'completed' | 'cancelled';
  winners: Array<{ username: string; wagered: number; rank: number }>;
};

export type RaceHistoryResult = { races: RaceHistoryItemDto[] };

@Injectable()
export class GetRaceHistoryUseCase {
  constructor(
    @Inject(RACES_REPOSITORY) private readonly races: IRacesRepository,
  ) {}

  async execute(limit: number): Promise<RaceHistoryResult> {
    const cap = Math.min(Math.max(limit, 1), 100);
    const rows = await this.races.listTerminalRaces(cap);
    const races: RaceHistoryItemDto[] = [];

    for (const race of rows) {
      const [totals, winners] = await Promise.all([
        this.races.getTotalsForRace(race.id),
        this.races.winnersForHistory(race.id, race.status),
      ]);

      races.push({
        id: race.id,
        prizePool: Number(race.totalPrizePool ?? 0),
        totalWagered: Number(totals.totalWagered),
        participants: totals.participants,
        startTime: race.startTime.toISOString(),
        endTime: race.endTime.toISOString(),
        status:
          race.status === RaceStatus.FINISHED ? 'completed' : 'cancelled',
        winners,
      });
    }

    return { races };
  }
}
