import { Injectable } from '@nestjs/common';
import {
  MinesPlayerControlStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { MinesModerationRowDto } from './dto/mines-moderation.out.dto';

@Injectable()
export class ListMinesModerationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filters: {
    status?: MinesPlayerControlStatus;
    search?: string;
  }): Promise<{ items: MinesModerationRowDto[] }> {
    const search = filters.search?.trim();
    const where: Prisma.MinesPlayerControlWhereInput = {};

    if (filters.status != null) {
      where.status = filters.status;
    } else {
      where.status = {
        in: [
          MinesPlayerControlStatus.BANNED,
          MinesPlayerControlStatus.LIMITED,
        ],
      };
    }

    if (search && search.length > 0) {
      where.userUsername = { contains: search, mode: 'insensitive' };
    }

    const rows = await this.prisma.minesPlayerControl.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const items: MinesModerationRowDto[] = rows.map((r) => ({
      userUsername: r.userUsername,
      status: r.status,
      maxBetAmount:
        r.maxBetAmount == null ? null : new Prisma.Decimal(r.maxBetAmount).toNumber(),
      maxGamesPerHour: r.maxGamesPerHour,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return { items };
  }
}
