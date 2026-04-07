import type { StaffCredential } from './staff-credential';

export type LoginResult =
  | {
      success: true;
      challengeId: string;
      expiresInSeconds: number;
      emailMasked: string;
    }
  | { success: false; error: 'INVALID_CREDENTIALS' };
