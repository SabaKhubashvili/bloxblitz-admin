import type { ITwoFactorChallengeRepository } from '../domain/two-factor-challenge.repository';
import type { IOtpHasher } from '../domain/otp-hasher';
import type { ITokenIssuer } from '../domain/token-issuer';
import type { IStaffAuthRepository } from '../domain/staff-auth.repository';
import type { IAuthAttemptLogger } from '../domain/auth-attempt-logger';
import type { VerifyTwoFactorResult } from '../domain/verify-two-factor-result';

export interface VerifyTwoFactorInput {
  challengeId: string;
  code: string;
}

export class VerifyTwoFactorUseCase {
  constructor(
    private readonly challengeRepository: ITwoFactorChallengeRepository,
    private readonly otpHasher: IOtpHasher,
    private readonly tokenIssuer: ITokenIssuer,
    private readonly staffAuthRepository: IStaffAuthRepository,
    private readonly authAttemptLogger: IAuthAttemptLogger,
    private readonly maxAttempts: number,
  ) {}

  async execute(input: VerifyTwoFactorInput): Promise<VerifyTwoFactorResult> {
    const row = await this.challengeRepository.findById(input.challengeId);

    if (!row) {
      this.authAttemptLogger.logTwoFactorAttempt({
        challengeId: input.challengeId,
        success: false,
        reason: 'not_found',
      });
      return { success: false, error: 'NOT_FOUND' };
    }

    if (row.consumedAt) {
      this.authAttemptLogger.logTwoFactorAttempt({
        challengeId: row.id,
        success: false,
        reason: 'already_consumed',
      });
      return { success: false, error: 'CONSUMED' };
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      this.authAttemptLogger.logTwoFactorAttempt({
        challengeId: row.id,
        success: false,
        reason: 'expired',
      });
      return { success: false, error: 'EXPIRED' };
    }

    if (row.failedAttempts >= this.maxAttempts) {
      this.authAttemptLogger.logTwoFactorAttempt({
        challengeId: row.id,
        success: false,
        reason: 'locked_out',
      });
      return { success: false, error: 'LOCKED_OUT' };
    }

    const ok = await this.otpHasher.verify(input.code, row.codeHash);

    if (!ok) {
      const attempts = await this.challengeRepository.incrementFailedAttempts(
        row.id,
      );
      const locked = attempts >= this.maxAttempts;
      this.authAttemptLogger.logTwoFactorAttempt({
        challengeId: row.id,
        success: false,
        reason: locked ? 'max_attempts' : 'invalid_code',
      });
      return {
        success: false,
        error: locked ? 'LOCKED_OUT' : 'INVALID_CODE',
      };
    }

    await this.challengeRepository.markConsumed(row.id);

    const staff = await this.staffAuthRepository.findStaffProfileById(
      row.staffMemberId,
    );
    if (!staff) {
      this.authAttemptLogger.logTwoFactorAttempt({
        challengeId: row.id,
        success: false,
        reason: 'staff_missing',
      });
      return { success: false, error: 'NOT_FOUND' };
    }

    const issued = await this.tokenIssuer.issueAccessToken({
      sub: staff.id,
      email: staff.email,
      role: staff.role,
      username: staff.username,
    });

    this.authAttemptLogger.logTwoFactorAttempt({
      challengeId: row.id,
      email: staff.email,
      success: true,
    });

    return {
      success: true,
      accessToken: issued.accessToken,
      expiresInSeconds: issued.expiresInSeconds,
      staff: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        username: staff.username,
      },
    };
  }
}
