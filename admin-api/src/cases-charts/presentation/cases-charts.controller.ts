import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetCasesOpeningsChartUseCase } from '../application/get-cases-openings-chart.use-case';
import { GetCasesPopularUseCase } from '../application/get-cases-popular.use-case';
import { GetCasesRevenueChartUseCase } from '../application/get-cases-revenue-chart.use-case';
import { CasesChartsQueryDto } from './dto/cases-charts.query.dto';
import type { CasesChartResponseDto } from './dto/cases-charts.response.dto';
import type { CasesPopularResponseDto } from './dto/cases-popular.response.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/cases/charts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CasesChartsController {
  constructor(
    private readonly getCasesRevenueChart: GetCasesRevenueChartUseCase,
    private readonly getCasesOpeningsChart: GetCasesOpeningsChartUseCase,
    private readonly getCasesPopular: GetCasesPopularUseCase,
  ) {}

  @Get('revenue')
  async revenue(
    @Query() query: CasesChartsQueryDto,
  ): Promise<CasesChartResponseDto> {
    return this.getCasesRevenueChart.execute(query.range);
  }

  @Get('openings')
  async openings(
    @Query() query: CasesChartsQueryDto,
  ): Promise<CasesChartResponseDto> {
    return this.getCasesOpeningsChart.execute(query.range);
  }

  @Get('popular')
  async popular(
    @Query() query: CasesChartsQueryDto,
  ): Promise<CasesPopularResponseDto> {
    return this.getCasesPopular.execute(query.range);
  }
}
