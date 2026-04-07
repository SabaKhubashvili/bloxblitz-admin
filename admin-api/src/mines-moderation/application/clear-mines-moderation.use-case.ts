import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinesPlayerControlRedisService } from '../infrastructure/mines-player-control.redis.service';

@Injectable()
export class ClearMinesModerationUseCase {
  private readonly log = new Logger(ClearMinesModerationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minesRedis: MinesPlayerControlRedisService,
  ) {}

  async execute(username: string): Promise<{ ok: true; changed: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await this.prisma.minesPlayerControl.deleteMany({
      where: { userUsername: username },
    });

    await this.minesRedis.remove(username);

    this.log.log(
      `[AUDIT] mines.moderation.clear userUsername=${username} removedRow=${result.count > 0}`,
    );

    return { ok: true, changed: result.count > 0 };
  }
}
