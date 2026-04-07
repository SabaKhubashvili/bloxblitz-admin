import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrashBetEligibilityCacheService } from '../infrastructure/crash-bet-eligibility-cache.service';

@Injectable()
export class ClearCrashPlayerRestrictionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityCache: CrashBetEligibilityCacheService,
  ) {}

  async execute(
    username: string,
  ): Promise<{ ok: true; changed: boolean }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
        select: { username: true },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const result = await this.prisma.crashPlayerControl.deleteMany({
        where: { userUsername: username },
      });

      return { ok: true, changed: result.count > 0 };
    } finally {
      await this.eligibilityCache.invalidate(username).catch(() => {});
    }
  }
}
