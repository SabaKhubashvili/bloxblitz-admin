import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, RaceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IRacesRepository,
  LeaderboardRow,
  RaceEntity,
  RaceTotals,
} from '../domain/races.repository.port';

function toEntity(row: {
  id: string;
  startTime: Date;
  endTime: Date;
  status: RaceStatus;
  totalPrizePool: Prisma.Decimal | null;
  trackingPaused: boolean;
  raceWindow: string | null;
}): RaceEntity {
  return {
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    totalPrizePool: row.totalPrizePool,
    trackingPaused: row.trackingPaused,
    raceWindow: row.raceWindow,
  };
}

@Injectable()
export class PrismaRacesRepository implements IRacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLiveRace(now: Date): Promise<RaceEntity | null> {
    const row = await this.prisma.race.findFirst({
      where: {
        status: { in: [RaceStatus.ACTIVE, RaceStatus.PAUSED] },
        startTime: { lte: now },
        endTime: { gt: now },
      },
      orderBy: { startTime: 'desc' },
    });
    return row ? toEntity(row) : null;
  }

  async findNextScheduledExcluding(
    excludeRaceId: string | undefined,
    now: Date,
  ): Promise<RaceEntity | null> {
    const row = await this.prisma.race.findFirst({
      where: {
        status: RaceStatus.SCHEDULED,
        startTime: { gt: now },
        ...(excludeRaceId ? { NOT: { id: excludeRaceId } } : {}),
      },
      orderBy: { startTime: 'asc' },
    });
    return row ? toEntity(row) : null;
  }

  async findAnyScheduled(now: Date): Promise<RaceEntity | null> {
    const row = await this.prisma.race.findFirst({
      where: {
        status: RaceStatus.SCHEDULED,
        endTime: { gt: now },
      },
      orderBy: { startTime: 'asc' },
    });
    return row ? toEntity(row) : null;
  }

  async getTotalsForRace(raceId: string): Promise<RaceTotals> {
    const [agg, participants] = await Promise.all([
      this.prisma.raceParticipant.aggregate({
        where: { raceId },
        _sum: { wageredAmount: true },
      }),
      this.prisma.raceParticipant.count({ where: { raceId } }),
    ]);
    return {
      totalWagered: agg._sum.wageredAmount ?? new Prisma.Decimal(0),
      participants,
    };
  }

  async findOverlappingRace(
    startTime: Date,
    endTime: Date,
    ignoreRaceId?: string,
  ): Promise<RaceEntity | null> {
    const row = await this.prisma.race.findFirst({
      where: {
        status: { in: [RaceStatus.SCHEDULED, RaceStatus.ACTIVE, RaceStatus.PAUSED] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        ...(ignoreRaceId ? { NOT: { id: ignoreRaceId } } : {}),
      },
    });
    return row ? toEntity(row) : null;
  }

  async createRace(input: {
    startTime: Date;
    endTime: Date;
    raceWindow: string | null;
    rewards: Array<{ position: number; rewardAmount: Prisma.Decimal }>;
  }): Promise<RaceEntity> {
    if (!input.rewards.length) {
      throw new BadRequestException('Race requires at least one reward tier');
    }

    let totalPrizePool = new Prisma.Decimal(0);
    for (const r of input.rewards) {
      totalPrizePool = totalPrizePool.plus(r.rewardAmount);
    }

    const now = new Date();
    const status =
      input.startTime.getTime() > now.getTime()
        ? RaceStatus.SCHEDULED
        : RaceStatus.ACTIVE;

    const row = await this.prisma.race.create({
      data: {
        startTime: input.startTime,
        endTime: input.endTime,
        status,
        trackingPaused: false,
        raceWindow: input.raceWindow,
        totalPrizePool,
        rewards: {
          create: input.rewards.map((r) => ({
            position: r.position,
            rewardAmount: r.rewardAmount,
          })),
        },
      },
    });
    return toEntity(row);
  }

  async listRaceRewards(
    raceId: string,
  ): Promise<Array<{ position: number; rewardAmount: Prisma.Decimal }>> {
    const rows = await this.prisma.raceReward.findMany({
      where: { raceId },
      orderBy: { position: 'asc' },
    });
    return rows.map((r) => ({
      position: r.position,
      rewardAmount: r.rewardAmount,
    }));
  }

  async findById(id: string): Promise<RaceEntity | null> {
    const row = await this.prisma.race.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async finishRace(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Race" WHERE "id" = ${id} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new NotFoundException('Race not found');
      }

      const race = await tx.race.findUnique({ where: { id } });
      if (!race) {
        throw new NotFoundException('Race not found');
      }
      if (
        race.status !== RaceStatus.ACTIVE &&
        race.status !== RaceStatus.PAUSED
      ) {
        throw new ConflictException('Race is not active');
      }

      await tx.$executeRaw`
        WITH ranked AS (
          SELECT "id",
                 ROW_NUMBER() OVER (
                   PARTITION BY "raceId"
                   ORDER BY "wageredAmount" DESC, "updatedAt" ASC
                 ) AS rn
          FROM "RaceParticipant"
          WHERE "raceId" = ${id}
        )
        UPDATE "RaceParticipant" AS rp
        SET "finalRank" = ranked.rn
        FROM ranked
        WHERE rp."id" = ranked."id"
      `;

      const sumRewards = await tx.raceReward.aggregate({
        where: { raceId: id },
        _sum: { rewardAmount: true },
      });

      await tx.race.update({
        where: { id },
        data: {
          status: RaceStatus.FINISHED,
          trackingPaused: false,
          totalPrizePool:
            sumRewards._sum.rewardAmount ?? new Prisma.Decimal(0),
        },
      });
    });
  }

  async cancelRace(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({ where: { id } });
      if (!race) {
        throw new NotFoundException('Race not found');
      }
      if (
        race.status === RaceStatus.FINISHED ||
        race.status === RaceStatus.CANCELLED
      ) {
        throw new ConflictException('Race already ended');
      }
      await tx.race.update({
        where: { id },
        data: { status: RaceStatus.CANCELLED, trackingPaused: false },
      });
    });
  }

  async setPaused(id: string, paused: boolean): Promise<void> {
    const race = await this.prisma.race.findUnique({ where: { id } });
    if (!race) {
      throw new NotFoundException('Race not found');
    }
    if (paused) {
      if (race.status !== RaceStatus.ACTIVE) {
        throw new ConflictException('Only an active race can be paused');
      }
      await this.prisma.race.update({
        where: { id },
        data: { status: RaceStatus.PAUSED },
      });
    } else {
      if (race.status !== RaceStatus.PAUSED) {
        throw new ConflictException('Race is not paused');
      }
      await this.prisma.race.update({
        where: { id },
        data: { status: RaceStatus.ACTIVE },
      });
    }
  }

  async setTrackingPaused(id: string, paused: boolean): Promise<void> {
    const race = await this.prisma.race.findUnique({ where: { id } });
    if (!race) {
      throw new NotFoundException('Race not found');
    }
    if (race.status !== RaceStatus.ACTIVE) {
      throw new ConflictException('Wager tracking can only toggle on active races');
    }
    await this.prisma.race.update({
      where: { id },
      data: { trackingPaused: paused },
    });
  }

  async listTerminalRaces(limit: number): Promise<RaceEntity[]> {
    const rows = await this.prisma.race.findMany({
      where: {
        status: { in: [RaceStatus.FINISHED, RaceStatus.CANCELLED] },
      },
      orderBy: { endTime: 'desc' },
      take: limit,
    });
    return rows.map(toEntity);
  }

  async findLeaderboardTopDb(
    raceId: string,
    limit: number,
  ): Promise<LeaderboardRow[]> {
    const rows = await this.prisma.raceParticipant.findMany({
      where: { raceId },
      orderBy: [{ wageredAmount: 'desc' }, { updatedAt: 'asc' }],
      take: limit,
      include: {
        user: { select: { username: true } },
      },
    });
    return rows.map((r, i) => ({
      username: r.user.username,
      wagered: Number(r.wageredAmount),
      rank: i + 1,
    }));
  }

  async winnersForHistory(
    raceId: string,
    status: RaceStatus,
  ): Promise<LeaderboardRow[]> {
    if (status === RaceStatus.FINISHED) {
      const rows = await this.prisma.raceParticipant.findMany({
        where: { raceId, finalRank: { not: null } },
        orderBy: { finalRank: 'asc' },
        take: 10,
        include: {
          user: { select: { username: true } },
        },
      });
      return rows.map((r) => ({
        username: r.user.username,
        wagered: Number(r.wageredAmount),
        rank: r.finalRank!,
      }));
    }

    const rows = await this.prisma.raceParticipant.findMany({
      where: { raceId },
      orderBy: [{ wageredAmount: 'desc' }, { updatedAt: 'asc' }],
      take: 10,
      include: {
        user: { select: { username: true } },
      },
    });
    return rows.map((r, i) => ({
      username: r.user.username,
      wagered: Number(r.wageredAmount),
      rank: i + 1,
    }));
  }

  async promoteDueScheduledRaces(now: Date): Promise<number> {
    const due = await this.prisma.race.findMany({
      where: {
        status: RaceStatus.SCHEDULED,
        startTime: { lte: now },
        endTime: { gt: now },
      },
      orderBy: { startTime: 'asc' },
    });
    let n = 0;
    for (const r of due) {
      await this.prisma.race.update({
        where: { id: r.id },
        data: { status: RaceStatus.ACTIVE },
      });
      n += 1;
    }
    return n;
  }

  async finishExpiredActiveRaces(now: Date): Promise<string[]> {
    const expired = await this.prisma.race.findMany({
      where: {
        status: { in: [RaceStatus.ACTIVE, RaceStatus.PAUSED] },
        endTime: { lte: now },
      },
      select: { id: true },
    });
    const ids: string[] = [];
    for (const { id } of expired) {
      try {
        await this.finishRace(id);
        ids.push(id);
      } catch {
        /* ignore single-row races that vanished between select and lock */
      }
    }
    return ids;
  }
}
