import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RouletteRestrictionRepositoryPort } from '../application/ports/roulette-restriction.repository.port';
import type { UpsertRouletteRestrictionInput } from '../application/ports/roulette-restriction.repository.port';
import {
  domainTimeframeToPrisma,
  prismaRowToSnapshot,
} from './prisma-roulette-restriction.mapper';

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

@Injectable()
export class PrismaRouletteRestrictionRepository
  implements RouletteRestrictionRepositoryPort
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
    const row = await this.prisma.roulettePlayerRestriction.findUnique({
      where: { userUsername: normalizeUsername(username) },
    });
    return row ? prismaRowToSnapshot(row) : null;
  }

  async findAll() {
    const rows = await this.prisma.roulettePlayerRestriction.findMany();
    return rows.map(prismaRowToSnapshot);
  }

  async upsert(input: UpsertRouletteRestrictionInput) {
    const userUsername = normalizeUsername(input.username);
    const row = await this.prisma.roulettePlayerRestriction.upsert({
      where: { userUsername },
      create: {
        userUsername,
        isBanned: input.isBanned,
        banReason: input.banReason,
        maxWagerAmount: input.maxWagerAmount,
        timeframe: domainTimeframeToPrisma(input.timeframe),
      },
      update: {
        isBanned: input.isBanned,
        banReason: input.banReason,
        maxWagerAmount: input.maxWagerAmount,
        timeframe: domainTimeframeToPrisma(input.timeframe),
      },
    });
    return prismaRowToSnapshot(row);
  }

  async deleteByUsername(username: string): Promise<void> {
    await this.prisma.roulettePlayerRestriction.deleteMany({
      where: { userUsername: normalizeUsername(username) },
    });
  }
}
