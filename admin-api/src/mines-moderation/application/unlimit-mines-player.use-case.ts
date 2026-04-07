import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MinesPlayerControlStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MinesPlayerControlRedisService } from '../infrastructure/mines-player-control.redis.service';

@Injectable()
export class UnlimitMinesPlayerUseCase {
  private readonly log = new Logger(UnlimitMinesPlayerUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minesRedis: MinesPlayerControlRedisService,
  ) {}

  /**
   * Removes wager / hourly caps (LIMITED). Deletes the control row and Redis keys.
   */
  async execute(username: string): Promise<{ ok: true; changed: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const row = await this.prisma.minesPlayerControl.findUnique({
      where: { userUsername: username },
    });
    if (!row) {
      await this.minesRedis.remove(username);
      this.log.warn(
        `[AUDIT] mines.moderation.unlimit username=${username} actor=admin result=no_db_row_redis_cleared`,
      );
      return { ok: true, changed: false };
    }
    if (row.status === MinesPlayerControlStatus.BANNED) {
      throw new ConflictException(
        'User is banned from Mines; use unban instead of unlimit.',
      );
    }
    if (row.status !== MinesPlayerControlStatus.LIMITED) {
      throw new BadRequestException('User does not have Mines wager/hour limits');
    }

    await this.prisma.minesPlayerControl.delete({
      where: { userUsername: username },
    });
    await this.minesRedis.remove(username);

    this.log.log(
      `[AUDIT] mines.moderation.unlimit username=${username} actor=admin result=cleared`,
    );

    return { ok: true, changed: true };
  }
}
