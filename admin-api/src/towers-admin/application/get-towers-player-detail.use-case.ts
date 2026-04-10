import { BadRequestException, Injectable } from '@nestjs/common';
import { GameStatus, GameType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeMinesAdminUsernameParam } from '../../mines-overview/common/mines-admin-username';
import type { TowersPlayerDetailResponseDto } from './dto/towers-players.out.dto';

const TERMINAL = [
  GameStatus.CASHED_OUT,
  GameStatus.WON,
  GameStatus.LOST,
] as const;

@Injectable()
export class GetTowersPlayerDetailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usernameRaw: string): Promise<TowersPlayerDetailResponseDto> {
    const usernameNorm = normalizeMinesAdminUsernameParam(usernameRaw);
    if (!usernameNorm) {
      throw new BadRequestException('Invalid username');
    }
    const username = usernameNorm.toLowerCase();

    const [agg, recent] = await this.prisma.$transaction([
      this.prisma.gameHistory.aggregate({
        where: {
          gameType: GameType.TOWERS,
          username,
          status: { in: [...TERMINAL] },
        },
        _count: { id: true },
        _sum: { betAmount: true, profit: true },
        _avg: {
          multiplier: true,
        },
      }),
      this.prisma.gameHistory.findMany({
        where: {
          gameType: GameType.TOWERS,
          username,
          status: { in: [...TERMINAL] },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          betAmount: true,
          profit: true,
          multiplier: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const totalGamesPlayed = agg._count.id;
    const totalWagered = num(agg._sum.betAmount);
    const netProfitLoss = num(agg._sum.profit);
    const avgMultiplier = agg._avg.multiplier == null ? 0 : num(agg._avg.multiplier);

    return {
      username,
      totalGamesPlayed,
      totalWagered,
      netProfitLoss,
      avgMultiplier,
      recentGames: recent.map((r) => ({
        id: r.id,
        betAmount: num(r.betAmount),
        profit: r.profit == null ? 0 : num(r.profit),
        multiplier: r.multiplier == null ? 0 : num(r.multiplier),
        outcome: toOutcome(r.status),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

function toOutcome(
  status: GameStatus,
): 'win' | 'loss' | 'cashout' {
  if (status === GameStatus.WON) return 'win';
  if (status === GameStatus.LOST) return 'loss';
  return 'cashout';
}
