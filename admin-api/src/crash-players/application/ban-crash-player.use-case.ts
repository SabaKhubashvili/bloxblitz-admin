import { Injectable, NotFoundException } from '@nestjs/common';
import { CrashPlayerControlStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrashBetEligibilityCacheService } from '../infrastructure/crash-bet-eligibility-cache.service';

@Injectable()
export class BanCrashPlayerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityCache: CrashBetEligibilityCacheService,
  ) {}

  async execute(
    username: string,
    note?: string | null,
  ): Promise<{ ok: true; alreadyBanned: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
        select: { username: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existing = await this.prisma.crashPlayerControl.findUnique({
        where: { userUsername: username },
      });

      if (existing?.status === CrashPlayerControlStatus.BANNED) {
        return { ok: true, alreadyBanned: true };
      }

      if (existing?.status === CrashPlayerControlStatus.LIMITED) {
        // Replacing limits with a full ban is allowed; continue.
      }

      await this.prisma.crashPlayerControl.upsert({
        where: { userUsername: username },
        create: {
          userUsername: username,
          status: CrashPlayerControlStatus.BANNED,
          maxBetAmount: null,
          minSecondsBetweenBets: null,
          note: note?.trim() || null,
        },
        update: {
          status: CrashPlayerControlStatus.BANNED,
          maxBetAmount: null,
          minSecondsBetweenBets: null,
          note: note?.trim() ?? undefined,
        },
      });

      return { ok: true, alreadyBanned: false };
    } finally {
      await this.eligibilityCache.invalidate(username).catch(() => {});
    }
  }
}
