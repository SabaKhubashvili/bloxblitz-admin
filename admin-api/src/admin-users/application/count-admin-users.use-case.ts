import { Inject, Injectable } from '@nestjs/common';
import type { AdminUserCountCriteria } from '../domain/admin-user-list.criteria';
import type { IAdminUserReadRepository } from '../domain/admin-user-read.repository';
import { ADMIN_USER_READ_REPOSITORY } from '../infrastructure/admin-user.tokens';

@Injectable()
export class CountAdminUsersUseCase {
  constructor(
    @Inject(ADMIN_USER_READ_REPOSITORY)
    private readonly users: IAdminUserReadRepository,
  ) {}

  async execute(
    criteria: AdminUserCountCriteria,
  ): Promise<{ totalUsers: number }> {
    const totalUsers = await this.users.count(criteria);
    return { totalUsers };
  }
}
