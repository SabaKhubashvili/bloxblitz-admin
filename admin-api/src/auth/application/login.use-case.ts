import type { IStaffAuthRepository } from '../domain/staff-auth.repository';
import type { IPasswordVerifier } from '../domain/password-verifier';
import type { IAuthAttemptLogger } from '../domain/auth-attempt-logger';
import type { LoginResult } from '../domain/login-result';
import type { ITwoFactorChallengeRepository } from '../domain/two-factor-challenge.repository';
import type { IOtpHasher } from '../domain/otp-hasher';
import type { ITwoFactorCodeGenerator } from '../domain/two-factor-code.generator';
import type { ITwoFactorMailer } from '../domain/two-factor-mailer';
import { Logger } from '@nestjs/common';

export interface LoginInput {
  email: string;
  password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || !local) {
    return '***';
  }
  const shown = local.slice(0, 1);
  return `${shown}***@${domain}`;
}

/**
 * Validates email/password; on success creates a time-limited 2FA challenge and emails the code.
 */
export class LoginUseCase {
  private readonly logger = new Logger('LoginUseCase');
  constructor(
    private readonly staffAuthRepository: IStaffAuthRepository,
    private readonly passwordVerifier: IPasswordVerifier,
    private readonly challengeRepository: ITwoFactorChallengeRepository,
    private readonly otpHasher: IOtpHasher,
    private readonly codeGenerator: ITwoFactorCodeGenerator,
    private readonly twoFactorMailer: ITwoFactorMailer,
    private readonly authAttemptLogger: IAuthAttemptLogger,
    private readonly codeTtlMs: number,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const email = normalizeEmail(input.email);
    const staff = await this.staffAuthRepository.findCredentialByEmail(email);

    if (!staff) {
      this.logger.warn(`Unknown email: ${email}`);
      this.authAttemptLogger.logLoginAttempt({
        email,
        success: false,
        reason: 'unknown_email',
      });
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    const passwordOk = await this.passwordVerifier.verify(
      input.password,
      staff.passwordHash,
    );

    if (!passwordOk) {
      this.logger.warn(`Invalid password for email: ${email}`);
      this.authAttemptLogger.logLoginAttempt({
        email,
        success: false,
        reason: 'invalid_password',
      });
      return { success: false, error: 'INVALID_CREDENTIALS' };
    }

    const plainCode = this.codeGenerator.generateSixDigitCode();
    const codeHash = await this.otpHasher.hash(plainCode);
    const expiresAt = new Date(Date.now() + this.codeTtlMs);

    this.logger.log(`Creating challenge for email: ${email}`);
    await this.challengeRepository.revokePendingForStaff(staff.id);
    const { id: challengeId } = await this.challengeRepository.createChallenge({
      staffMemberId: staff.id,
      codeHash,
      expiresAt,
    });

    this.logger.log(`Sending login code to email: ${staff.email}`);
    await this.twoFactorMailer.sendLoginCode(staff.email, plainCode);

    this.logger.log(`Challenge created for email: ${email}`);
    this.authAttemptLogger.logLoginAttempt({ email, success: true });

    return {
      success: true,
      challengeId,
      expiresInSeconds: Math.ceil(this.codeTtlMs / 1000),
      emailMasked: maskEmail(staff.email),
    };
  }
}
