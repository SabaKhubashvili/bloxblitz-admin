import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetDiceHeatmapAnalyticsUseCase } from '../application/get-dice-heatmap-analytics.use-case';
import { GetDiceTargetRangesAnalyticsUseCase } from '../application/get-dice-target-ranges-analytics.use-case';
import { GetDiceScatterAnalyticsUseCase } from '../application/get-dice-scatter-analytics.use-case';
import { GetDiceRiskAnalyticsUseCase } from '../application/get-dice-risk-analytics.use-case';
import {
  DiceAnalyticsDetailQueryDto,
  DiceScatterAnalyticsQueryDto,
} from './dto/dice-analytics-detail.query.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/dice/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class DiceAnalyticsDetailController {
  constructor(
    private readonly getHeatmap: GetDiceHeatmapAnalyticsUseCase,
    private readonly getTargetRanges: GetDiceTargetRangesAnalyticsUseCase,
    private readonly getScatter: GetDiceScatterAnalyticsUseCase,
    private readonly getRisk: GetDiceRiskAnalyticsUseCase,
  ) {}

  @Get('heatmap')
  async heatmap(@Query() query: DiceAnalyticsDetailQueryDto) {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getHeatmap.execute(range, query.player);
  }

  @Get('target-ranges')
  async targetRangesRoute(@Query() query: DiceAnalyticsDetailQueryDto) {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getTargetRanges.execute(range, query.player);
  }

  @Get('scatter')
  async scatterRoute(@Query() query: DiceScatterAnalyticsQueryDto) {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getScatter.execute(range, {
      player: query.player,
      minBet: query.minBet,
      maxBet: query.maxBet,
    });
  }

  @Get('risk')
  async riskRoute(@Query() query: DiceAnalyticsDetailQueryDto) {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getRisk.execute(range);
  }
}
