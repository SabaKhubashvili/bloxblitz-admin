export interface TwoFactorChallengeRow {
  id: string;
  staffMemberId: string;
  codeHash: string;
  expiresAt: Date;
  failedAttempts: number;
  consumedAt: Date | null;
  lastCodeSentAt: Date;
}

export interface ITwoFactorChallengeRepository {
  revokePendingForStaff(staffMemberId: string): Promise<void>;
  createChallenge(data: {
    staffMemberId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<{ id: string }>;
  findById(id: string): Promise<TwoFactorChallengeRow | null>;
  incrementFailedAttempts(id: string): Promise<number>;
  markConsumed(id: string): Promise<void>;
  updateCodeAfterResend(data: {
    id: string;
    codeHash: string;
    lastCodeSentAt: Date;
    expiresAt: Date;
  }): Promise<void>;
}
