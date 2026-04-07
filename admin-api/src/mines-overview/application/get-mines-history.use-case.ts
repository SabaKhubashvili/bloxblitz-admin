import { Injectable } from '@nestjs/common';
import { GameStatus, GameType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  MinesHistoryGameDto,
  MinesHistoryResponseDto,
} from '../presentation/dto/mines-history.response.dto';

const MAX_LIMIT = 50;

@Injectable()
export class GetMinesHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(limitRaw: number): Promise<MinesHistoryResponseDto> {
    const limit = clampLimit(limitRaw);
    const rows = await this.prisma.gameHistory.findMany({
      where: {
        gameType: GameType.MINES,
        status: {
          in: [
            GameStatus.CASHED_OUT,
            GameStatus.WON,
            GameStatus.LOST,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        betAmount: true,
        profit: true,
        multiplier: true,
        status: true,
        createdAt: true,
      },
    });

    const games: MinesHistoryGameDto[] = rows.map((row) => {
      const bet = num(row.betAmount);
      const profit = row.profit == null ? 0 : num(row.profit);
      const payout = bet + profit;
      const mult = row.multiplier == null ? 0 : num(row.multiplier);
      return {
        id: row.id,
        userId: row.username,
        betAmount: bet,
        payout,
        multiplier: mult,
        status: toHistoryStatus(row.status),
        createdAt: row.createdAt.toISOString(),
      };
    });

    return { games };
  }
}

function clampLimit(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

function toHistoryStatus(status: GameStatus): 'cashed_out' | 'lost' {
  if (status === GameStatus.LOST) return 'lost';
  return 'cashed_out';
}
