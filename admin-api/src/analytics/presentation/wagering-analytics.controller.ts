import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetMonthlyGgrChartUseCase } from '../application/get-monthly-ggr-chart.use-case';
import { GetStatisticsChartUseCase } from '../application/get-statistics-chart.use-case';
import { GetWageringStatsUseCase } from '../application/get-wagering-stats.use-case';
import type { MonthlyGgrChartCriteria } from '../domain/monthly-ggr-chart.criteria';
import type { WageringStatsCriteria } from '../domain/wagering-stats.criteria';
import { MonthlyGgrChartQueryDto } from './dto/monthly-ggr-chart.query.dto';
import { StatisticsChartQueryDto } from './dto/statistics-chart.query.dto';
import { WageringStatsQueryDto } from './dto/wagering-stats.query.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/analytics/wagering')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class WageringAnalyticsController {
  constructor(
    private readonly getWageringStats: GetWageringStatsUseCase,
    private readonly getMonthlyGgrChart: GetMonthlyGgrChartUseCase,
    private readonly getStatisticsChart: GetStatisticsChartUseCase,
  ) {}

  @Get()
  async getStats(@Query() query: WageringStatsQueryDto) {
    const criteria = this.toCriteria(query);
    return this.getWageringStats.execute(criteria);
  }

  @Get('monthly-ggr-chart')
  async monthlyGgrChart(@Query() query: MonthlyGgrChartQueryDto) {
    const criteria = this.toMonthlyCriteria(query);
    return this.getMonthlyGgrChart.execute(criteria);
  }

  @Get('statistics-chart')
  async statisticsChart(@Query() query: StatisticsChartQueryDto) {
    return this.getStatisticsChart.execute({
      preset: query.preset,
      startDate: query.startDate,
      endDate: query.endDate,
      gameType: query.gameType,
      diceRollMode: query.diceRollMode,
    });
  }

  private toCriteria(query: WageringStatsQueryDto): WageringStatsCriteria {
    return {
      singlePreset: query.range,
      gameType: query.gameType,
      diceRollMode: query.diceRollMode,
    };
  }

  private toMonthlyCriteria(
    query: MonthlyGgrChartQueryDto,
  ): MonthlyGgrChartCriteria {
    return {
      monthCount: query.months ?? 12,
      timeZone: query.timeZone?.trim() || 'UTC',
      gameType: query.gameType,
      diceRollMode: query.diceRollMode,
    };
  }
}
