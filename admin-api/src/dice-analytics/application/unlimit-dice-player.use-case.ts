import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DicePlayerControlStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DicePlayerControlRedisService } from '../infrastructure/dice-player-control.redis.service';
import { GetDicePlayerDetailUseCase } from './get-dice-player-detail.use-case';
import type { DicePlayerStatsDto } from '../presentation/dto/dice-players.response.dto';

@Injectable()
export class UnlimitDicePlayerUseCase {
  private readonly log = new Logger(UnlimitDicePlayerUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly diceRedis: DicePlayerControlRedisService,
    private readonly getDetail: GetDicePlayerDetailUseCase,
  ) {}

  async execute(username: string): Promise<DicePlayerStatsDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const row = await this.prisma.dicePlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (!row) {
      await this.diceRedis.remove(username);
      await this.diceRedis.bumpPlayersListCache();
      return this.getDetail.execute(username);
    }
    if (row.status === DicePlayerControlStatus.BANNED) {
      throw new ConflictException(
        'User is banned from dice; use unban instead of unlimit.',
      );
    }
    if (row.status !== DicePlayerControlStatus.LIMITED) {
      throw new BadRequestException('User does not have dice wager limits');
    }

    await this.prisma.dicePlayerControl.delete({
      where: { userUsername: username },
    });
    await this.diceRedis.remove(username);
    await this.diceRedis.bumpPlayersListCache();
    this.log.log(`[AUDIT] dice.moderation.unlimit userUsername=${username}`);

    return this.getDetail.execute(username);
  }
}
