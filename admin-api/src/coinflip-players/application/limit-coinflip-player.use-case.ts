import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoinflipPlayerControlStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CoinflipPlayerModerationRedisSync } from '../infrastructure/coinflip-player-moderation-redis.sync';

export type LimitCoinflipPlayerInput = {
  maxWagerAmount?: number | null;
  maxGamesPerHour?: number | null;
  note?: string | null;
};

@Injectable()
export class LimitCoinflipPlayerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisSync: CoinflipPlayerModerationRedisSync,
  ) {}

  async execute(
    username: string,
    input: LimitCoinflipPlayerInput,
  ): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.coinflipPlayerControl.findUnique({
      where: { userUsername: username },
    });

    if (existing?.status === CoinflipPlayerControlStatus.BANNED) {
      throw new ConflictException(
        'User is banned from coinflip; lift moderation before applying limits.',
      );
    }

    const limitKeysTouched =
      input.maxWagerAmount !== undefined 

    if (!limitKeysTouched && input.note === undefined) {
      throw new BadRequestException(
        'Provide maxWagerAmount and/or maxGamesPerHour and/or note.',
      );
    }

    if (!limitKeysTouched && input.note !== undefined) {
      if (existing?.status !== CoinflipPlayerControlStatus.LIMITED) {
        throw new BadRequestException(
          'Can only update the note when the player already has coinflip limits.',
        );
      }
      await this.prisma.coinflipPlayerControl.update({
        where: { userUsername: username },
        data: { note: input.note?.trim() || null },
      });
      return { ok: true };
    }

    let nextWager: Prisma.Decimal | null = existing?.maxWagerAmount ?? null;

    if (input.maxWagerAmount !== undefined) {
      if (input.maxWagerAmount === null) {
        nextWager = null;
      } else if (input.maxWagerAmount <= 0) {
        throw new BadRequestException('maxWagerAmount must be positive.');
      } else {
        nextWager = new Prisma.Decimal(input.maxWagerAmount.toFixed(2));
      }
    }


    const hasWager = nextWager != null && nextWager.gt(0);
    await this.prisma.coinflipPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: CoinflipPlayerControlStatus.LIMITED,
        maxWagerAmount: nextWager,
        note: input.note !== undefined ? input.note?.trim() || null : null,
      },
      update: {
        status: CoinflipPlayerControlStatus.LIMITED,
        maxWagerAmount: nextWager,
        ...(input.note !== undefined
          ? { note: input.note?.trim() || null }
          : {}),
      },
    });

    if (hasWager && nextWager) {
      const cents = Math.round(nextWager.toNumber() * 100);
      await this.redisSync.setMaxBetCents(username, cents);
    } else {
      await this.redisSync.setMaxBetCents(username, null);
    }


    return { ok: true };
  }
}
