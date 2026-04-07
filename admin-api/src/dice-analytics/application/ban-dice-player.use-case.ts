import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DicePlayerControlStatus } from '@prisma/client';
import { DicePlayerControlRedisService } from '../infrastructure/dice-player-control.redis.service';
import { GetDicePlayerDetailUseCase } from './get-dice-player-detail.use-case';
import type { DicePlayerStatsDto } from '../presentation/dto/dice-players.response.dto';

@Injectable()
export class BanDicePlayerUseCase {
  private readonly log = new Logger(BanDicePlayerUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly diceRedis: DicePlayerControlRedisService,
    private readonly getDetail: GetDicePlayerDetailUseCase,
  ) {}

  async execute(
    username: string,
    reason?: string,
  ): Promise<DicePlayerStatsDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const note = reason?.trim().slice(0, 500) || null;

    const row = await this.prisma.dicePlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: DicePlayerControlStatus.BANNED,
        maxBetAmount: null,
        note,
      },
      update: {
        status: DicePlayerControlStatus.BANNED,
        maxBetAmount: null,
        note,
      },
    });

    await this.diceRedis.writeFromRow(row);
    await this.diceRedis.bumpPlayersListCache();
    this.log.log(`[AUDIT] dice.moderation.ban userUsername=${username}`);

    return this.getDetail.execute(username);
  }
}
