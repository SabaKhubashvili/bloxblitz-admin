import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CrashPlayerControlStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CrashBetEligibilityCacheService } from '../infrastructure/crash-bet-eligibility-cache.service';

/** Omitted fields keep previous values; pass `null` to clear a limit. */
export type LimitCrashPlayerInput = {
  maxBetAmount?: number | null;
  minSecondsBetweenBets?: number | null;
  note?: string | null;
};

@Injectable()
export class LimitCrashPlayerUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityCache: CrashBetEligibilityCacheService,
  ) {}

  async execute(
    username: string,
    input: LimitCrashPlayerInput,
  ): Promise<{ ok: true }> {
    try {
      return await this.run(username, input);
    } finally {
      await this.eligibilityCache.invalidate(username).catch(() => {});
    }
  }

  private async run(
    username: string,
    input: LimitCrashPlayerInput,
  ): Promise<{ ok: true }> {
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
      throw new ConflictException(
        'User is banned from Crash; remove the ban before applying limits.',
      );
    }

    const limitKeysTouched =
      input.maxBetAmount !== undefined ||
      input.minSecondsBetweenBets !== undefined;
    if (!limitKeysTouched && input.note === undefined) {
      throw new BadRequestException(
        'Provide maxBetAmount and/or minSecondsBetweenBets and/or note.',
      );
    }

    if (!limitKeysTouched && input.note !== undefined) {
      if (existing?.status !== CrashPlayerControlStatus.LIMITED) {
        throw new BadRequestException(
          'Can only update the note when the player already has Crash limits.',
        );
      }
      await this.prisma.crashPlayerControl.update({
        where: { userUsername: username },
        data: { note: input.note?.trim() || null },
      });
      return { ok: true };
    }

    let nextMax: Prisma.Decimal | null = existing?.maxBetAmount ?? null;
    let nextSec: number | null = existing?.minSecondsBetweenBets ?? null;

    if (input.maxBetAmount !== undefined) {
      if (input.maxBetAmount === null) {
        nextMax = null;
      } else if (input.maxBetAmount <= 0) {
        throw new BadRequestException('maxBetAmount must be positive.');
      } else {
        nextMax = new Prisma.Decimal(input.maxBetAmount.toFixed(2));
      }
    }

    if (input.minSecondsBetweenBets !== undefined) {
      if (input.minSecondsBetweenBets === null) {
        nextSec = null;
      } else if (input.minSecondsBetweenBets < 1) {
        throw new BadRequestException(
          'minSecondsBetweenBets must be at least 1.',
        );
      } else {
        nextSec = input.minSecondsBetweenBets;
      }
    }

    const hasEffectiveMax = nextMax != null && nextMax.gt(0);
    const hasEffectiveCooldown = nextSec != null && nextSec >= 1;
    if (!hasEffectiveMax && !hasEffectiveCooldown) {
      throw new BadRequestException(
        'At least one of maxBetAmount or minSecondsBetweenBets must be set after this update.',
      );
    }

    await this.prisma.crashPlayerControl.upsert({
      where: { userUsername: username },
      create: {
        userUsername: username,
        status: CrashPlayerControlStatus.LIMITED,
        maxBetAmount: nextMax,
        minSecondsBetweenBets: nextSec,
        note: input.note !== undefined ? input.note?.trim() || null : null,
      },
      update: {
        status: CrashPlayerControlStatus.LIMITED,
        maxBetAmount: nextMax,
        minSecondsBetweenBets: nextSec,
        ...(input.note !== undefined
          ? { note: input.note?.trim() || null }
          : {}),
      },
    });

    return { ok: true };
  }
}

