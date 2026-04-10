import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetRouletteAnalyticsUseCase } from '../application/get-roulette-analytics.use-case';
import { GetRecentRouletteBetsUseCase } from '../application/get-recent-roulette-bets.use-case';
import { GetRoulettePlayersUseCase } from '../application/get-roulette-players.use-case';
import { GetRouletteConfigUseCase } from '../application/get-roulette-config.use-case';
import { UpdateRouletteConfigUseCase } from '../application/update-roulette-config.use-case';
import { GetRouletteOperatorStateUseCase } from '../application/get-roulette-operator-state.use-case';
import { RouletteAnalyticsQueryDto } from './dto/roulette-analytics.query.dto';
import type { RouletteAnalyticsResponseDto } from './dto/roulette-analytics.response.dto';
import { RouletteRecentBetsQueryDto } from './dto/roulette-recent-bets.query.dto';
import { RoulettePlayersQueryDto } from './dto/roulette-players.query.dto';
import type { RoulettePlayersResponseDto } from './dto/roulette-players.response.dto';
import type { RouletteConfigResponseDto } from './dto/roulette-config.response.dto';
import { RouletteConfigUpdateDto } from './dto/roulette-config.update.dto';
import type { RouletteOperatorStateResponseDto } from './dto/roulette-operator-state.response.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/roulette')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class RouletteAdminController {
  constructor(
    private readonly getRouletteAnalytics: GetRouletteAnalyticsUseCase,
    private readonly getRecentRouletteBets: GetRecentRouletteBetsUseCase,
    private readonly getRoulettePlayers: GetRoulettePlayersUseCase,
    private readonly getRouletteConfig: GetRouletteConfigUseCase,
    private readonly updateRouletteConfig: UpdateRouletteConfigUseCase,
    private readonly getRouletteOperatorState: GetRouletteOperatorStateUseCase,
  ) {}

  @Get('analytics')
  async analytics(
    @Query() query: RouletteAnalyticsQueryDto,
  ): Promise<RouletteAnalyticsResponseDto> {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getRouletteAnalytics.execute(range);
  }

  @Get('recent-bets')
  async recentBets(@Query() query: RouletteRecentBetsQueryDto) {
    return this.getRecentRouletteBets.execute({
      limit: query.limit,
      player: query.player,
    });
  }

  @Get('players')
  async players(
    @Query() query: RoulettePlayersQueryDto,
  ): Promise<RoulettePlayersResponseDto> {
    return this.getRoulettePlayers.execute(query);
  }

  @Get('config')
  async configGet(): Promise<RouletteConfigResponseDto> {
    return this.getRouletteConfig.execute();
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  async configPost(
    @Body() body: RouletteConfigUpdateDto,
  ): Promise<RouletteConfigResponseDto> {
    return this.updateRouletteConfig.execute(body);
  }

  @Get('operator/state')
  async operatorState(): Promise<RouletteOperatorStateResponseDto> {
    return this.getRouletteOperatorState.execute();
  }
}
