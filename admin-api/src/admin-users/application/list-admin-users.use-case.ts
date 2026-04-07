import { Inject, Injectable } from '@nestjs/common';
import { ChatBanService } from '../../chat-ban/chat-ban.service';
import type { AdminUserListCriteria } from '../domain/admin-user-list.criteria';
import type { IAdminUserReadRepository } from '../domain/admin-user-read.repository';
import type { AdminUserSummary } from '../domain/admin-user-summary';
import { ADMIN_USER_READ_REPOSITORY } from '../infrastructure/admin-user.tokens';

export interface ListAdminUsersResult {
  data: AdminUserSummary[];
  meta: {
    currentPage: number;
    limit: number;
    totalUsers: number;
    totalPages: number;
  };
}

@Injectable()
export class ListAdminUsersUseCase {
  constructor(
    @Inject(ADMIN_USER_READ_REPOSITORY)
    private readonly users: IAdminUserReadRepository,
    private readonly chatBan: ChatBanService,
  ) {}

  async execute(
    criteria: AdminUserListCriteria,
  ): Promise<ListAdminUsersResult> {
    const { users, totalUsers } = await this.users.findPage(criteria);
    const banMap = await this.chatBan.getBanStatusMapForUsernames(
      users.map((u) => u.username),
    );
    const data: AdminUserSummary[] = this.chatBan.mergeSummaries(
      users,
      banMap,
    );
    const totalPages =
      totalUsers === 0 ? 0 : Math.ceil(totalUsers / criteria.limit);
    return {
      data,
      meta: {
        currentPage: criteria.page,
        limit: criteria.limit,
        totalUsers,
        totalPages,
      },
    };
  }
}
