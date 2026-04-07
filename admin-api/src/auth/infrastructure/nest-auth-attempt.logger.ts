import { Injectable, Logger } from '@nestjs/common';
import type {
  AuthAttemptLogEntry,
  IAuthAttemptLogger,
  TwoFactorAttemptLogEntry,
} from '../domain/auth-attempt-logger';

@Injectable()
export class NestAuthAttemptLogger implements IAuthAttemptLogger {
  private readonly logger = new Logger('AuthAudit');

  logLoginAttempt(entry: AuthAttemptLogEntry): void {
    const { email, success, reason } = entry;
    if (success) {
      this.logger.log(`Login password OK, 2FA sent: email=${email}`);
    } else {
      this.logger.warn(
        `Login failed: email=${email} reason=${reason ?? 'unknown'}`,
      );
    }
  }

  logTwoFactorAttempt(entry: TwoFactorAttemptLogEntry): void {
    const { challengeId, email, success, reason } = entry;
    const idPart = challengeId ? `challengeId=${challengeId} ` : '';
    const emailPart = email ? `email=${email} ` : '';
    if (success) {
      this.logger.log(`2FA verify succeeded: ${idPart}${emailPart}`.trim());
    } else {
      this.logger.warn(
        `2FA verify failed: ${idPart}${emailPart}reason=${reason ?? 'unknown'}`,
      );
    }
  }
}
