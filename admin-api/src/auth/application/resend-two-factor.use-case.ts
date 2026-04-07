import type { ITwoFactorChallengeRepository } from '../domain/two-factor-challenge.repository';
import type { IOtpHasher } from '../domain/otp-hasher';
import type { ITwoFactorCodeGenerator } from '../domain/two-factor-code.generator';
import type { ITwoFactorMailer } from '../domain/two-factor-mailer';
import type { IStaffAuthRepository } from '../domain/staff-auth.repository';
import type { ResendTwoFactorResult } from '../domain/verify-two-factor-result';

export interface ResendTwoFactorInput {
  challengeId: string;
}

export class ResendTwoFactorUseCase {
  constructor(
    private readonly challengeRepository: ITwoFactorChallengeRepository,
    private readonly otpHasher: IOtpHasher,
    private readonly codeGenerator: ITwoFactorCodeGenerator,
    private readonly twoFactorMailer: ITwoFactorMailer,
    private readonly staffAuthRepository: IStaffAuthRepository,
    private readonly codeTtlMs: number,
    private readonly resendCooldownMs: number,
  ) {}

  async execute(input: ResendTwoFactorInput): Promise<ResendTwoFactorResult> {
    const row = await this.challengeRepository.findById(input.challengeId);

    if (!row) {
      return { success: false, error: 'NOT_FOUND' };
    }

    if (row.consumedAt) {
      return { success: false, error: 'CONSUMED' };
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      return { success: false, error: 'EXPIRED' };
    }

    const elapsed = Date.now() - row.lastCodeSentAt.getTime();
    if (elapsed < this.resendCooldownMs) {
      const retryAfterSeconds = Math.ceil(
        (this.resendCooldownMs - elapsed) / 1000,
      );
      return {
        success: false,
        error: 'COOLDOWN',
        retryAfterSeconds,
      };
    }

    const staff = await this.staffAuthRepository.findStaffProfileById(
      row.staffMemberId,
    );
    if (!staff) {
      return { success: false, error: 'NOT_FOUND' };
    }

    const plainCode = this.codeGenerator.generateSixDigitCode();
    const codeHash = await this.otpHasher.hash(plainCode);
    const expiresAt = new Date(Date.now() + this.codeTtlMs);

    await this.challengeRepository.updateCodeAfterResend({
      id: row.id,
      codeHash,
      lastCodeSentAt: new Date(),
      expiresAt,
    });

    await this.twoFactorMailer.sendLoginCode(staff.email, plainCode);

    return {
      success: true,
      expiresInSeconds: Math.ceil(this.codeTtlMs / 1000),
    };
  }
}
