import { Injectable } from '@nestjs/common';
import { GameStatus, GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { MinesPlayerRoundDto } from './dto/mines-players.out.dto';

const ROUND_STATUSES: GameStatus[] = [
  GameStatus.CASHED_OUT,
  GameStatus.WON,
  GameStatus.LOST,
];

@Injectable()
export class GetMinesPlayerHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(username: string): Promise<{ rounds: MinesPlayerRoundDto[] }> {
    const rows = await this.prisma.gameHistory.findMany({
      where: {
        gameType: GameType.MINES,
        status: { in: ROUND_STATUSES },
        username: { equals: username, mode: Prisma.QueryMode.insensitive },
      },
      include: { minesBetHistory: true },
      orderBy: { createdAt: 'desc' },
    });

    const rounds: MinesPlayerRoundDto[] = [];
    for (const row of rows) {
      const mbh = row.minesBetHistory;
      if (!mbh) continue;

      const bet = decimalToNumber(row.betAmount);
      const profit = row.profit == null ? 0 : decimalToNumber(row.profit);
      const mult =
        row.multiplier == null ? 0 : decimalToNumber(row.multiplier);

      rounds.push({
        id: row.id,
        username: row.username,
        betAmount: bet,
        minesCount: mbh.minesCount,
        tilesCleared: mbh.revealedTiles.length,
        cashoutMultiplier: mult,
        profitLoss: profit,
        timestamp: row.createdAt.toISOString(),
        gridSize: mbh.gridSize,
        status: row.status,
        mineIndices: [...mbh.minePositions],
        revealedIndices: [...mbh.revealedTiles],
      });
    }

    return { rounds };
  }
}

function decimalToNumber(d: Prisma.Decimal): number {
  return typeof d === 'number' ? d : Number(d.toString());
}
