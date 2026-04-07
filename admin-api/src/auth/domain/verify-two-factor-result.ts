import type { StaffCredential } from './staff-credential';

export type VerifyTwoFactorResult =
  | {
      success: true;
      accessToken: string;
      expiresInSeconds: number;
      staff: Pick<StaffCredential, 'id' | 'email' | 'role' | 'username'>;
    }
  | {
      success: false;
      error:
        | 'NOT_FOUND'
        | 'EXPIRED'
        | 'CONSUMED'
        | 'LOCKED_OUT'
        | 'INVALID_CODE';
    };

export type ResendTwoFactorResult =
  | { success: true; expiresInSeconds: number }
  | {
      success: false;
      error: 'NOT_FOUND' | 'EXPIRED' | 'CONSUMED' | 'COOLDOWN';
      retryAfterSeconds?: number;
    };
