import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetCaseAnalyticsUseCase } from '../application/get-case-analytics.use-case';
import { CaseAnalyticsQueryDto } from './dto/case-analytics.query.dto';
import type { CaseAnalyticsResponseDto } from './dto/case-analytics.response.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CaseAnalyticsController {
  constructor(private readonly getCaseAnalytics: GetCaseAnalyticsUseCase) {}

  /** Per-case dashboard: KPIs, most-won, open-rate series (gap-filled), drop distribution. */
  @Get(':caseId/analytics')
  async analytics(
    @Param('caseId') caseId: string,
    @Query() query: CaseAnalyticsQueryDto,
  ): Promise<CaseAnalyticsResponseDto> {
    const range = query.range ?? '30d';
    const mostWonLimit = query.limit ?? 10;
    return this.getCaseAnalytics.execute({ caseId, range, mostWonLimit });
  }
}
