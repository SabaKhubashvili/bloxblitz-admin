import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mapCoinflipControlStatus } from '../domain/map-coinflip-control-status';

export type CoinflipPlayerStatusResult = {
  username: string;
  status: ReturnType<typeof mapCoinflipControlStatus>;
  limits: {
    maxWagerAmount: string | null;
    maxGamesPerHour: number | null;
  } | null;
  note: string | null;
};

@Injectable()
export class GetCoinflipPlayerStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(username: string): Promise<CoinflipPlayerStatusResult> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const row = await this.prisma.coinflipPlayerControl.findUnique({
      where: { userUsername: username },
    });

    if (!row) {
      return {
        username,
        status: 'active',
        limits: null,
        note: null,
      };
    }

    const status = mapCoinflipControlStatus(row.status);
    const limits =
      status === 'limited'
        ? {
            maxWagerAmount:
              row.maxWagerAmount != null
                ? new Prisma.Decimal(row.maxWagerAmount).toFixed(2)
                : null,
            maxGamesPerHour: row.maxGamesPerHour,
          }
        : null;

    return {
      username,
      status,
      limits,
      note: row.note,
    };
  }
}
