import type { AdminUserStatus } from './admin-user-status';

export function deriveAdminUserStatus(
  lastLoginAt: Date | null,
  activeWithinDays: number,
): AdminUserStatus {
  if (!lastLoginAt) {
    return 'NEVER_LOGGED_IN';
  }
  const cutoff = new Date(Date.now() - activeWithinDays * 24 * 60 * 60 * 1000);
  return lastLoginAt >= cutoff ? 'ACTIVE' : 'INACTIVE';
}
