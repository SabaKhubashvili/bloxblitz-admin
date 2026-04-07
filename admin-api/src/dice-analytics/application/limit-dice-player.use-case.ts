import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DicePlayerControlStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DicePlayerControlRedisService } from '../infrastructure/dice-player-control.redis.service';
import { GetDicePlayerDetailUseCase } from './get-dice-player-detail.use-case';
import type { DicePlayerStatsDto } from '../presentation/dto/dice-players.response.dto';

@Injectable()
export class LimitDicePlayerUseCase {
  private readonly log = new Logger(LimitDicePlayerUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly diceRedis: DicePlayerControlRedisService,
    private readonly getDetail: GetDicePlayerDetailUseCase,
  ) {}

  async execute(
    username: string,
    maxBet: number,
    reason?: string,
  ): Promise<DicePlayerStatsDto> {
    if (!Number.isFinite(maxBet) || maxBet <= 0) {
      throw new BadRequestException('maxBet must be a positive number');
    }

    const rounded = Math.round(maxBet * 100) / 100;

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.dicePlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (existing?.status === DicePlayerControlStatus.BANNED) {
      throw new ConflictException(
        'User is banned from dice; unban before applying limits.',
      );
    }

    const note = reason?.trim().slice(0, 500) || null;

    const row = await this.prisma.dicePlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: DicePlayerControlStatus.LIMITED,
        maxBetAmount: new Prisma.Decimal(rounded),
        note,
      },
      update: {
        status: DicePlayerControlStatus.LIMITED,
        maxBetAmount: new Prisma.Decimal(rounded),
        note,
      },
    });

    await this.diceRedis.writeFromRow(row);
    await this.diceRedis.bumpPlayersListCache();
    this.log.log(
      `[AUDIT] dice.moderation.limit userUsername=${username} maxBet=${rounded}`,
    );

    return this.getDetail.execute(username);
  }
}
