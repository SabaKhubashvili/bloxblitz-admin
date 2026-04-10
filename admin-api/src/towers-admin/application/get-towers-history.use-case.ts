import { Injectable } from '@nestjs/common';
import { GameStatus, GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeMinesPlayerSearch } from '../../mines-overview/common/mines-admin-username';
import type {
  TowersHistoryGameDto,
  TowersHistoryResponseDto,
} from './dto/towers-history.out.dto';

const TERMINAL: GameStatus[] = [
  GameStatus.CASHED_OUT,
  GameStatus.WON,
  GameStatus.LOST,
];

const MAX_LIMIT = 100;

export type TowersHistoryInput = {
  page?: number;
  limit?: number;
  username?: string;
  outcome?: 'all' | 'won' | 'lost' | 'cashed_out';
  from?: string;
  to?: string;
};

@Injectable()
export class GetTowersHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: TowersHistoryInput): Promise<TowersHistoryResponseDto> {
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? 25));
    const skip = (page - 1) * limit;

    const search = normalizeMinesPlayerSearch(input.username);
    if (
      input.username !== undefined &&
      input.username.trim() !== '' &&
      search === null
    ) {
      return { games: [], total: 0, page, limit };
    }

    const statusFilter = outcomeToStatuses(input.outcome ?? 'all');

    const createdAt: Prisma.DateTimeFilter | undefined = parseDateRange(
      input.from,
      input.to,
    );

    const where: Prisma.GameHistoryWhereInput = {
      gameType: GameType.TOWERS,
      status: { in: statusFilter },
      ...(search
        ? {
            username: { contains: search, mode: 'insensitive' },
          }
        : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.gameHistory.count({ where }),
      this.prisma.gameHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          betAmount: true,
          profit: true,
          multiplier: true,
          status: true,
          createdAt: true,
          towersGameHistory: {
            select: {
              difficulty: true,
              levels: true,
              status: true,
              currentRowIndex: true,
            },
          },
        },
      }),
    ]);

    const games: TowersHistoryGameDto[] = rows.map((row) => {
      const bet = num(row.betAmount);
      const profit = row.profit == null ? 0 : num(row.profit);
      const mult = row.multiplier == null ? 0 : num(row.multiplier);
      return {
        id: row.id,
        userId: row.username,
        betAmount: bet,
        profit,
        multiplier: mult,
        outcome: toOutcomeLabel(row.status),
        difficulty: row.towersGameHistory?.difficulty ?? null,
        levels: row.towersGameHistory?.levels ?? null,
        towersDetailStatus: row.towersGameHistory?.status ?? null,
        createdAt: row.createdAt.toISOString(),
      };
    });

    return { games, total, page, limit };
  }
}

function parseDateRange(
  from?: string,
  to?: string,
): Prisma.DateTimeFilter | undefined {
  const f = from ? Date.parse(from) : NaN;
  const t = to ? Date.parse(to) : NaN;
  if (!Number.isFinite(f) && !Number.isFinite(t)) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (Number.isFinite(f)) filter.gte = new Date(f);
  if (Number.isFinite(t)) filter.lte = new Date(t);
  return Object.keys(filter).length ? filter : undefined;
}

function outcomeToStatuses(
  outcome: TowersHistoryInput['outcome'],
): GameStatus[] {
  if (!outcome || outcome === 'all') return TERMINAL;
  if (outcome === 'won') return [GameStatus.WON];
  if (outcome === 'lost') return [GameStatus.LOST];
  return [GameStatus.CASHED_OUT];
}

function toOutcomeLabel(status: GameStatus): TowersHistoryGameDto['outcome'] {
  if (status === GameStatus.WON) return 'win';
  if (status === GameStatus.LOST) return 'loss';
  return 'cashout';
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}
