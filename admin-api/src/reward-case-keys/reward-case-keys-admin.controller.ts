import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../auth/presentation/jwt-auth.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import type { StaffPrincipal } from '../auth/presentation/staff-principal';
import { RewardCaseKeysAdminService } from './reward-case-keys-admin.service';
import { GetUserKeysQueryDto } from './dto/get-user-keys.query.dto';
import { SetUserKeysBodyDto } from './dto/set-user-keys.body.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/reward-case-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class RewardCaseKeysAdminController {
  constructor(private readonly service: RewardCaseKeysAdminService) {}

  /** GET /admin/reward-case-keys?username=:username */
  @Get()
  getBalances(@Query() query: GetUserKeysQueryDto) {
    return this.service.getKeyBalancesForUser(query.username);
  }

  /** PATCH /admin/reward-case-keys */
  @Patch()
  setBalance(
    @Body() body: SetUserKeysBodyDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    return this.service.setKeyBalance(body, staff);
  }
}
