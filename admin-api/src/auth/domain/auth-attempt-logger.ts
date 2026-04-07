export interface AuthAttemptLogEntry {
  email: string;
  success: boolean;
  reason?: string;
}

export interface TwoFactorAttemptLogEntry {
  challengeId?: string;
  email?: string;
  success: boolean;
  reason?: string;
}

export interface IAuthAttemptLogger {
  logLoginAttempt(entry: AuthAttemptLogEntry): void;
  logTwoFactorAttempt(entry: TwoFactorAttemptLogEntry): void;
}
