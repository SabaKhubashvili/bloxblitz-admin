import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserRewardKeySource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RewardCasesCacheInvalidator } from '../reward-cases/infrastructure/reward-cases-cache-invalidator';
import type { StaffPrincipal } from '../auth/presentation/staff-principal';
import type { SetUserKeysBodyDto } from './dto/set-user-keys.body.dto';

export type UserKeyCaseRow = {
  rewardCaseId: string;
  slug: string;
  title: string;
  imageUrl: string;
  position: number;
  isActive: boolean;
  balance: number;
};

@Injectable()
export class RewardCaseKeysAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheInvalidator: RewardCasesCacheInvalidator,
  ) {}

  /**
   * Returns all reward cases (active or not) with the user's current key
   * balance for each. Balances sum all ledger rows (positive grants + negative
   * spends + admin adjustments).
   */
  async getKeyBalancesForUser(username: string): Promise<UserKeyCaseRow[]> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { username: true },
    });
    if (!user) throw new NotFoundException(`User "${username}" not found`);

    const [cases, sums] = await Promise.all([
      this.prisma.rewardCaseDefinition.findMany({
        orderBy: { position: 'asc' },
        select: {
          id: true,
          slug: true,
          title: true,
          imageUrl: true,
          position: true,
          isActive: true,
        },
      }),
      this.prisma.userKey.groupBy({
        by: ['rewardCaseId'],
        where: { userUsername: username },
        _sum: { quantity: true },
      }),
    ]);

    const balanceMap = new Map(
      sums.map((s) => [s.rewardCaseId, s._sum.quantity ?? 0]),
    );

    return cases.map((c) => ({
      rewardCaseId: c.id,
      slug: c.slug,
      title: c.title,
      imageUrl: c.imageUrl,
      position: c.position,
      isActive: c.isActive,
      balance: balanceMap.get(c.id) ?? 0,
    }));
  }

  /**
   * Sets a user's key balance for a specific case (via `newBalance`) or
   * applies a signed `delta`. Creates a ledger entry with source
   * ADMIN_ADJUSTMENT and writes an audit log row.
   *
   * Returns the updated balance and the applied delta.
   */
  async setKeyBalance(
    body: SetUserKeysBodyDto,
    staff: StaffPrincipal,
  ): Promise<{ balance: number; delta: number; previousBalance: number }> {
    if (body.newBalance === undefined && body.delta === undefined) {
      throw new BadRequestException('Provide either newBalance or delta');
    }
    if (body.newBalance !== undefined && body.delta !== undefined) {
      throw new BadRequestException('Provide only one of newBalance or delta');
    }

    const user = await this.prisma.user.findUnique({
      where: { username: body.username },
      select: { username: true },
    });
    if (!user) throw new NotFoundException(`User "${body.username}" not found`);

    const caseRow = await this.prisma.rewardCaseDefinition.findUnique({
      where: { id: body.rewardCaseId },
      select: { id: true, slug: true, title: true },
    });
    if (!caseRow)
      throw new NotFoundException(
        `Reward case "${body.rewardCaseId}" not found`,
      );

    const { balance: previousBalance, appliedDelta } =
      await this.prisma.$transaction(async (tx) => {
        const sumRow = await tx.userKey.aggregate({
          where: {
            userUsername: body.username,
            rewardCaseId: body.rewardCaseId,
          },
          _sum: { quantity: true },
        });
        const current = sumRow._sum.quantity ?? 0;

        let appliedDelta: number;
        if (body.newBalance !== undefined) {
          appliedDelta = body.newBalance - current;
        } else {
          // delta mode: clamp result to 0
          const rawResult = current + body.delta!;
          appliedDelta = Math.max(-current, body.delta!);
          void rawResult; // suppress unused warning
        }

        if (appliedDelta === 0) {
          return { balance: current, appliedDelta: 0 };
        }

        await tx.userKey.create({
          data: {
            id: randomUUID(),
            userUsername: body.username,
            rewardCaseId: body.rewardCaseId,
            quantity: appliedDelta,
            source: UserRewardKeySource.ADMIN_ADJUSTMENT,
            referenceId: `admin-${staff.staffId}`,
          },
        });

        return { balance: current + appliedDelta, appliedDelta };
      });

    // Drop the per-user reward-cases cache so the public API reflects the
    // admin adjustment immediately (best-effort — non-fatal on failure).
    await this.cacheInvalidator.invalidateUserState(body.username);

    // Audit log (best-effort — do not fail the request if this throws)
    await this.prisma.adminAuditLog
      .create({
        data: {
          staffId: staff.staffId,
          staffEmail: staff.email.slice(0, 320),
          action: 'REWARD_KEY_ADJUSTMENT',
          targetUserUsername: body.username,
          payload: {
            rewardCaseId: body.rewardCaseId,
            rewardCaseSlug: caseRow.slug,
            rewardCaseTitle: caseRow.title,
            previousBalance,
            appliedDelta,
            newBalance: previousBalance + appliedDelta,
            reason: body.reason ?? null,
          },
        },
      })
      .catch(() => {
        /* non-blocking */
      });

    return {
      previousBalance,
      delta: appliedDelta,
      balance: previousBalance + appliedDelta,
    };
  }
}
