import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetCrashMultiplierHistoryUseCase } from '../application/get-crash-multiplier-history.use-case';
import { GetCrashPlayerActivityChartUseCase } from '../application/get-crash-player-activity-chart.use-case';
import { GetCrashProfitLossChartUseCase } from '../application/get-crash-profit-loss-chart.use-case';
import { GetCrashStatisticsOverviewUseCase } from '../application/get-crash-statistics-overview.use-case';
import { CrashRuntimeRedisService } from '../infrastructure/crash-runtime-redis.service';
import { CrashStatisticsOverviewQueryDto } from './dto/crash-statistics-overview.query.dto';
import type {
  CrashMultiplierHistoryEntryDto,
  CrashPlayerActivityChartPointDto,
  CrashProfitLossChartPointDto,
  CrashRuntimeStateResponseDto,
  CrashStatisticsOverviewResponseDto,
} from './dto/crash-control-room.response.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/crash/control-room')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CrashControlRoomController {
  constructor(
    private readonly getCrashStatisticsOverview: GetCrashStatisticsOverviewUseCase,
    private readonly getCrashMultiplierHistory: GetCrashMultiplierHistoryUseCase,
    private readonly getCrashProfitLossChart: GetCrashProfitLossChartUseCase,
    private readonly getCrashPlayerActivityChart: GetCrashPlayerActivityChartUseCase,
    private readonly crashRuntimeRedis: CrashRuntimeRedisService,
  ) {}

  @Get('overview')
  async overview(
    @Query() query: CrashStatisticsOverviewQueryDto,
  ): Promise<CrashStatisticsOverviewResponseDto> {
    return this.getCrashStatisticsOverview.execute(query.range);
  }

  @Get('multiplier-history')
  async multiplierHistory(): Promise<CrashMultiplierHistoryEntryDto[]> {
    return this.getCrashMultiplierHistory.execute();
  }

  @Get('profit-loss-chart')
  async profitLossChart(): Promise<CrashProfitLossChartPointDto[]> {
    return this.getCrashProfitLossChart.execute();
  }

  @Get('player-activity-chart')
  async playerActivityChart(): Promise<CrashPlayerActivityChartPointDto[]> {
    return this.getCrashPlayerActivityChart.execute();
  }

  /** Redis-only: global pause / bet lock for the Crash game service. */
  @Get('runtime')
  async crashRuntimeState(): Promise<CrashRuntimeStateResponseDto> {
    return this.crashRuntimeRedis.getState();
  }

  @Post('runtime/pause')
  async pauseCrashGame(): Promise<CrashRuntimeStateResponseDto> {
    await this.crashRuntimeRedis.setPaused(true);
    return this.crashRuntimeRedis.getState();
  }

  @Post('runtime/resume')
  async resumeCrashGame(): Promise<CrashRuntimeStateResponseDto> {
    await this.crashRuntimeRedis.setPaused(false);
    return this.crashRuntimeRedis.getState();
  }

  @Post('runtime/disable-bets')
  async disableCrashBets(): Promise<CrashRuntimeStateResponseDto> {
    await this.crashRuntimeRedis.setBetsDisabled(true);
    return this.crashRuntimeRedis.getState();
  }

  @Post('runtime/enable-bets')
  async enableCrashBets(): Promise<CrashRuntimeStateResponseDto> {
    await this.crashRuntimeRedis.setBetsDisabled(false);
    return this.crashRuntimeRedis.getState();
  }
}
