import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import type { StaffPrincipal } from '../../auth/presentation/staff-principal';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { ChatBanService } from '../../chat-ban/chat-ban.service';
import { CountAdminUsersUseCase } from '../application/count-admin-users.use-case';
import { ListAdminUsersUseCase } from '../application/list-admin-users.use-case';
import { GlobalUserModerationUseCase } from '../application/global-user-moderation.use-case';
import { UpdateAdminGameUserUseCase } from '../application/update-admin-game-user.use-case';
import type {
  AdminUserCountCriteria,
  AdminUserListCriteria,
} from '../domain/admin-user-list.criteria';
import { AdminUsersFilterQueryDto } from './dto/admin-users-filter.query.dto';
import { AdminUsersListQueryDto } from './dto/admin-users-list.query.dto';
import { UpdateAdminGameUserBodyDto } from './dto/update-admin-game-user.body.dto';
import { GlobalUserModerationBodyDto } from './dto/global-user-moderation.body.dto';
import { PostUserChatBanBodyDto } from './dto/post-user-chat-ban.body.dto';

const DEFAULT_ACTIVE_DAYS = 90;

/**
 * Staff JWT routes must skip `login` / `twoFactor` throttlers (they apply
 * globally otherwise; user list polling would exceed 5–20 req/min).
 */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class AdminUsersController {
  constructor(
    private readonly countAdminUsers: CountAdminUsersUseCase,
    private readonly listAdminUsers: ListAdminUsersUseCase,
    private readonly globalModeration: GlobalUserModerationUseCase,
    private readonly updateGameUser: UpdateAdminGameUserUseCase,
    private readonly chatBan: ChatBanService,
  ) {}

  @Get('count')
  async count(@Query() query: AdminUsersFilterQueryDto) {
    const criteria = this.toCountCriteria(query);
    return this.countAdminUsers.execute(criteria);
  }

  @Get()
  async list(@Query() query: AdminUsersListQueryDto) {
    const criteria = this.toListCriteria(query);
    return this.listAdminUsers.execute(criteria);
  }

  @Patch(':username')
  async patchUser(
    @Param('username') username: string,
    @Body() body: UpdateAdminGameUserBodyDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    return this.updateGameUser.execute(username, body, staff);
  }

  @Post(':username/moderation')
  async moderation(
    @Param('username') username: string,
    @Body() body: GlobalUserModerationBodyDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    return this.globalModeration.execute(username, body, staff);
  }

  @Get(':userKey/chat-ban')
  @Roles(UserRoles.ADMIN, UserRoles.OWNER, UserRoles.COMMUNITY_MANAGER)
  async getChatBan(@Param('userKey') userKey: string) {
    return this.chatBan.getBanStatusForUser(userKey);
  }

  @Post(':userKey/chat-ban')
  @Roles(UserRoles.ADMIN, UserRoles.OWNER, UserRoles.COMMUNITY_MANAGER)
  async postChatBan(
    @Param('userKey') userKey: string,
    @Body() body: PostUserChatBanBodyDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    return this.chatBan.banUser({
      userKey,
      staff,
      reason: body.reason,
      durationMinutes: body.durationMinutes,
    });
  }

  @Post(':userKey/chat-unban')
  @Roles(UserRoles.ADMIN, UserRoles.OWNER, UserRoles.COMMUNITY_MANAGER)
  async postChatUnban(@Param('userKey') userKey: string) {
    return this.chatBan.unbanUser(userKey);
  }

  private toCountCriteria(
    query: AdminUsersFilterQueryDto,
  ): AdminUserCountCriteria {
    const activeWithinDays = query.activeWithinDays ?? DEFAULT_ACTIVE_DAYS;
    return {
      emailSearch: query.email,
      role: query.role,
      status: query.status,
      moderationStatus: query.moderationStatus,
      activeWithinDays,
    };
  }

  private toListCriteria(query: AdminUsersListQueryDto): AdminUserListCriteria {
    const activeWithinDays = query.activeWithinDays ?? DEFAULT_ACTIVE_DAYS;
    return {
      emailSearch: query.email,
      role: query.role,
      status: query.status,
      moderationStatus: query.moderationStatus,
      activeWithinDays,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sort: query.sort ?? 'created_at',
      order: query.order ?? 'desc',
    };
  }
}
