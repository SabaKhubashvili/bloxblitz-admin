import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ITwoFactorChallengeRepository,
  TwoFactorChallengeRow,
} from '../domain/two-factor-challenge.repository';

@Injectable()
export class PrismaTwoFactorChallengeRepository
  implements ITwoFactorChallengeRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async revokePendingForStaff(staffMemberId: string): Promise<void> {
    await this.prisma.staffTwoFactorChallenge.deleteMany({
      where: {
        staff_member_id: staffMemberId,
        consumed_at: null,
      },
    });
  }

  async createChallenge(data: {
    staffMemberId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<{ id: string }> {
    const row = await this.prisma.staffTwoFactorChallenge.create({
      data: {
        staff_member_id: data.staffMemberId,
        code_hash: data.codeHash,
        expires_at: data.expiresAt,
        delivery_method: 'EMAIL',
      },
      select: { id: true },
    });
    return { id: row.id };
  }

  async findById(id: string): Promise<TwoFactorChallengeRow | null> {
    const row = await this.prisma.staffTwoFactorChallenge.findUnique({
      where: { id },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      staffMemberId: row.staff_member_id,
      codeHash: row.code_hash,
      expiresAt: row.expires_at,
      failedAttempts: row.failed_attempts,
      consumedAt: row.consumed_at,
      lastCodeSentAt: row.last_code_sent_at,
    };
  }

  async incrementFailedAttempts(id: string): Promise<number> {
    const row = await this.prisma.staffTwoFactorChallenge.update({
      where: { id },
      data: { failed_attempts: { increment: 1 } },
      select: { failed_attempts: true },
    });
    return row.failed_attempts;
  }

  async markConsumed(id: string): Promise<void> {
    await this.prisma.staffTwoFactorChallenge.update({
      where: { id },
      data: { consumed_at: new Date() },
    });
  }

  async updateCodeAfterResend(data: {
    id: string;
    codeHash: string;
    lastCodeSentAt: Date;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.staffTwoFactorChallenge.update({
      where: { id: data.id },
      data: {
        code_hash: data.codeHash,
        last_code_sent_at: data.lastCodeSentAt,
        expires_at: data.expiresAt,
        failed_attempts: 0,
      },
    });
  }
}
