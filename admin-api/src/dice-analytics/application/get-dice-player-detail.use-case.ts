import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DicePlayerControlStatus } from '@prisma/client';
import type { IDiceAnalyticsRepository } from '../domain/dice-analytics.repository.port';
import type { DicePlayerStatsDto } from '../presentation/dto/dice-players.response.dto';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';
import { toDicePlayerStatsDto } from './dice-player-stats.mapper';

@Injectable()
export class GetDicePlayerDetailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
  ) {}

  async execute(username: string): Promise<DicePlayerStatsDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const agg = await this.repo.aggregateOneDicePlayer(username);
    const control = await this.prisma.dicePlayerControl.findUnique({
      where: { userUsername: username },
    });

    const base = agg ?? {
      username,
      rolls: 0,
      wagered: 0,
      wins: 0,
      profitLoss: 0,
      avgChance: 50,
      betStddev: null,
      betMean: 0,
      moderationStatus: null,
      moderationMaxBet: null,
    };

    const merged = {
      ...base,
      moderationStatus:
        control?.status === DicePlayerControlStatus.BANNED
          ? 'BANNED'
          : control?.status === DicePlayerControlStatus.LIMITED
            ? 'LIMITED'
            : null,
      moderationMaxBet:
        control?.maxBetAmount != null
          ? Number(control.maxBetAmount)
          : null,
    };

    return toDicePlayerStatsDto(merged);
  }
}
