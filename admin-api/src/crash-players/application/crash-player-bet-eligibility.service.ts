import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CrashPlayerControl, CrashPlayerControlStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CachedCrashControlSnapshot,
  CrashBetEligibilityCacheService,
} from '../infrastructure/crash-bet-eligibility-cache.service';

/**
 * Enforces `CrashPlayerControl` for Crash stakes. Control rows are cached (Redis when
 * `REDIS_URL` is set, else in-memory) so repeated checks avoid an extra DB round trip.
 * Cooldown still uses an indexed `CrashBet` lookup when `minSecondsBetweenBets` is set.
 *
 * For lobby/join flows: call `scheduleWarmControlCache(username)` without awaiting so
 * the first `validate-bet` is more likely to hit cache and stay fast.
 */
@Injectable()
export class CrashPlayerBetEligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly controlCache: CrashBetEligibilityCacheService,
  ) {}

  /**
   * Fire-and-forget refresh of the control-row cache from the database. Does not block;
   * use when the user enters the Crash lobby or joins a channel so betting stays snappy.
   */
  scheduleWarmControlCache(username: string): void {
    const u = username.trim();
    if (!u) return;
    setImmediate(() => {
      void this.refreshControlFromDb(u).catch(() => {});
    });
  }

  async assertCanPlaceCrashBet(
    username: string,
    betAmount: string | number | Prisma.Decimal,
  ): Promise<void> {
    const u = username.trim();
    if (!u) {
      throw new ForbiddenException('Invalid user.');
    }

    const controlSnapshot = await this.resolveControlSnapshot(u);

    if (controlSnapshot.status === CrashPlayerControlStatus.BANNED) {
      throw new ForbiddenException(
        'This account is banned from Crash.',
      );
    }

    const amount = new Prisma.Decimal(betAmount.toString());
    if (amount.lte(0)) {
      throw new ForbiddenException('Invalid bet amount.');
    }

    const maxBetStr = controlSnapshot.maxBetAmount;
    if (maxBetStr != null) {
      const maxBet = new Prisma.Decimal(maxBetStr);
      if (amount.gt(maxBet)) {
        throw new ForbiddenException(
          'Bet exceeds the maximum allowed for your Crash account.',
        );
      }
    }

    const minSec = controlSnapshot.minSecondsBetweenBets;
    if (minSec != null && minSec > 0) {
      const last = await this.prisma.crashBet.findFirst({
        where: { userUsername: u },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (last) {
        const elapsedSec =
          (Date.now() - last.createdAt.getTime()) / 1000;
        if (elapsedSec < minSec) {
          throw new ForbiddenException(
            'Crash bet rate limit is active for your account.',
          );
        }
      }
    }
  }

  private async resolveControlSnapshot(
    username: string,
  ): Promise<CachedCrashControlSnapshot> {
    const cached = await this.controlCache.get(username);
    if (cached !== undefined) {
      return cached;
    }
    return this.refreshControlFromDb(username);
  }

  private async refreshControlFromDb(
    username: string,
  ): Promise<CachedCrashControlSnapshot> {
    const row = await this.prisma.crashPlayerControl.findUnique({
      where: { userUsername: username },
    });
    const snapshot = row ? snapshotFromRow(row) : snapshotNoRow();
    await this.controlCache.set(username, snapshot);
    return snapshot;
  }
}

function snapshotFromRow(row: CrashPlayerControl): CachedCrashControlSnapshot {
  return {
    status: row.status,
    maxBetAmount:
      row.maxBetAmount != null ? row.maxBetAmount.toFixed(2) : null,
    minSecondsBetweenBets: row.minSecondsBetweenBets ?? null,
  };
}

function snapshotNoRow(): CachedCrashControlSnapshot {
  return {
    status: CrashPlayerControlStatus.ACTIVE,
    maxBetAmount: null,
    minSecondsBetweenBets: null,
  };
}
