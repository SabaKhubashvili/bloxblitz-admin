import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentStaff } from '../../common/decorators/current-staff.decorator';
import type { StaffPrincipal } from '../../auth/presentation/staff-principal';
import { GetCoinflipSuspiciousUsersUseCase } from '../application/get-coinflip-suspicious-users.use-case';
import { GetCoinflipSuspiciousGamesUseCase } from '../application/get-coinflip-suspicious-games.use-case';
import { GetCoinflipUserRiskProfileUseCase } from '../application/get-coinflip-user-risk-profile.use-case';
import { CoinflipFraudAdminActionsUseCase } from '../application/coinflip-fraud-admin-actions.use-case';
import { CoinflipFraudListQueryDto } from './dto/coinflip-fraud-list.query.dto';
import { CoinflipFraudFlagBodyDto } from './dto/coinflip-fraud-flag.body.dto';
import { CoinflipFraudLimitBodyDto } from './dto/coinflip-fraud-limit.body.dto';
import { CoinflipFraudBanBodyDto } from './dto/coinflip-fraud-ban.body.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/coinflip/fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CoinflipFraudController {
  constructor(
    private readonly suspiciousUsers: GetCoinflipSuspiciousUsersUseCase,
    private readonly suspiciousGames: GetCoinflipSuspiciousGamesUseCase,
    private readonly riskProfile: GetCoinflipUserRiskProfileUseCase,
    private readonly actions: CoinflipFraudAdminActionsUseCase,
  ) {}

  @Get('suspicious-users')
  async listUsers(@Query() query: CoinflipFraudListQueryDto) {
    const minScore = query.minScore ?? 0;
    const maxScore = query.maxScore ?? 100;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 40;
    return this.suspiciousUsers.execute({ minScore, maxScore, offset, limit });
  }

  @Get('suspicious-games')
  async listGames(@Query() query: CoinflipFraudListQueryDto) {
    const minScore = query.minScore ?? 12;
    const maxScore = query.maxScore ?? 100;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 40;
    return this.suspiciousGames.execute({ minScore, maxScore, offset, limit });
  }

  @Get('users/:username/risk-profile')
  async profile(@Param('username') username: string) {
    return this.riskProfile.execute(decodeURIComponent(username));
  }

  @Post('users/:username/flag')
  async flag(
    @Param('username') username: string,
    @Body() body: CoinflipFraudFlagBodyDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    return this.actions.flagUser({
      username: decodeURIComponent(username),
      note: body.note,
      staffUser: staff.email,
    });
  }

  @Post('users/:username/limit')
  async limit(
    @Param('username') username: string,
    @Body() body: CoinflipFraudLimitBodyDto,
    @CurrentStaff() staff: StaffPrincipal,
  ) {
    await this.actions.limitUser({
      username: decodeURIComponent(username),
      maxBetScaleBps: body.maxBetScaleBps,
      maxBetCents: body.maxBetCents,
      matchmakingDelayMs: body.matchmakingDelayMs,
      staffUser: staff.email,
    });
    return { ok: true };
  }

  @Post('users/:username/ban')
  async ban(
    @Param('username') username: string,
    @Body() body: CoinflipFraudBanBodyDto,
  ) {
    return this.actions.banUser({
      username: decodeURIComponent(username),
      reason: body.reason,
      untilIso: body.untilIso,
    });
  }

  @Post('users/:username/clear')
  async clear(@Param('username') username: string) {
    return this.actions.clearUser({
      username: decodeURIComponent(username),
    });
  }
}
