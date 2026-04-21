import type {
  AdminUserCountCriteria,
  AdminUserListCriteria,
} from './admin-user-list.criteria';
import type { AdminUserSummary } from './admin-user-summary';

export interface AdminUserListPage {
  users: AdminUserSummary[];
  totalUsers: number;
}



export interface IAdminUserReadRepository {
  count(criteria: AdminUserCountCriteria): Promise<number>;
  findPage(criteria: AdminUserListCriteria): Promise<AdminUserListPage>;
  findSummaryByUsername(
    username: string,
    activeWithinDays: number,
  ): Promise<AdminUserSummary | null>;
}
