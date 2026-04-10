import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { TowersRestrictionRepositoryPort } from '../application/ports/towers-restriction.repository.port';
import type { UpsertTowersRestrictionInput } from '../application/ports/towers-restriction.repository.port';
import { prismaRowToSnapshot } from './prisma-towers-restriction.mapper';

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

@Injectable()
export class PrismaTowersRestrictionRepository
  implements TowersRestrictionRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async resolveUsername(raw: string): Promise<string | null> {
    const n = normalizeUsername(raw);
    const row = await this.prisma.user.findUnique({
      where: { username: n },
      select: { username: true },
    });
    return row?.username ?? null;
  }

  async findByUsername(username: string) {
    const row = await this.prisma.towersPlayerRestriction.findUnique({
      where: { userUsername: normalizeUsername(username) },
    });
    return row ? prismaRowToSnapshot(row) : null;
  }

  async findAll() {
    const rows = await this.prisma.towersPlayerRestriction.findMany();
    return rows.map(prismaRowToSnapshot);
  }

  async upsert(input: UpsertTowersRestrictionInput) {
    const userUsername = normalizeUsername(input.username);
    const row = await this.prisma.towersPlayerRestriction.upsert({
      where: { userUsername },
      create: {
        userUsername,
        isBanned: input.isBanned,
        banReason: input.banReason,
        dailyWagerLimit: input.dailyWagerLimit,
        weeklyWagerLimit: input.weeklyWagerLimit,
        monthlyWagerLimit: input.monthlyWagerLimit,
        limitReason: input.limitReason,
      },
      update: {
        isBanned: input.isBanned,
        banReason: input.banReason,
        dailyWagerLimit: input.dailyWagerLimit,
        weeklyWagerLimit: input.weeklyWagerLimit,
        monthlyWagerLimit: input.monthlyWagerLimit,
        limitReason: input.limitReason,
      },
    });
    return prismaRowToSnapshot(row);
  }

  async deleteByUsername(username: string): Promise<void> {
    await this.prisma.towersPlayerRestriction.deleteMany({
      where: { userUsername: normalizeUsername(username) },
    });
  }
}
