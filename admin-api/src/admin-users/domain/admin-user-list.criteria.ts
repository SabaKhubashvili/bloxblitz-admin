import type { UserRoles } from '@prisma/client';
import type { AdminUserModerationStatus } from './admin-user-moderation-status';
import type { AdminUserStatus } from './admin-user-status';

export type AdminUserSortField = 'balance' | 'wager' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface AdminUserListCriteria {
  emailSearch?: string;
  role?: UserRoles;
  status?: AdminUserStatus;
  moderationStatus?: AdminUserModerationStatus;
  /** Users with `last_login_at >= now - activeWithinDays` count as ACTIVE. */
  activeWithinDays: number;
  page: number;
  limit: number;
  sort: AdminUserSortField;
  order: SortOrder;
}

export interface AdminUserCountCriteria {
  emailSearch?: string;
  role?: UserRoles;
  status?: AdminUserStatus;
  moderationStatus?: AdminUserModerationStatus;
  activeWithinDays: number;
}
