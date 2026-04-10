import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import type { RollingAnalyticsPresetWithAll } from '../../common/rolling-analytics-window';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetTowersOverviewUseCase } from '../application/get-towers-overview.use-case';
import { GetTowersHistoryUseCase } from '../application/get-towers-history.use-case';
import { GetTowersPlayersUseCase } from '../application/get-towers-players.use-case';
import { GetTowersPlayerDetailUseCase } from '../application/get-towers-player-detail.use-case';
import {
  isValidTowersConfigNumbers,
  parseTowersConfigFromUnknown,
} from '../domain/towers-config.validation';
import { TowersConfigRedisService } from '../infrastructure/towers-config.redis.service';
import { TowersSystemStateRedisService } from '../infrastructure/towers-system-state.redis.service';
import { TowersOverviewQueryDto } from './dto/towers-overview.query.dto';
import type { TowersOverviewResponseDto } from '../application/dto/towers-overview.out.dto';
import { TowersHistoryQueryDto } from './dto/towers-history.query.dto';
import type { TowersHistoryResponseDto } from '../application/dto/towers-history.out.dto';
import { TowersConfigUpdateDto } from './dto/towers-config.update.dto';
import type { TowersConfigResponseDto } from './dto/towers-config.response.dto';
import { TowersPlayersQueryDto } from './dto/towers-players.query.dto';
import type { TowersPlayerDetailResponseDto } from '../application/dto/towers-players.out.dto';
import { TowersSystemStateUpdateDto } from './dto/towers-system-state.update.dto';
import type { TowersSystemStateResponseDto } from './dto/towers-system-state.response.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/towers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class TowersAdminController {
  constructor(
    private readonly getTowersOverview: GetTowersOverviewUseCase,
    private readonly getTowersHistory: GetTowersHistoryUseCase,
    private readonly getTowersPlayers: GetTowersPlayersUseCase,
    private readonly getTowersPlayerDetail: GetTowersPlayerDetailUseCase,
    private readonly towersConfigRedis: TowersConfigRedisService,
    private readonly towersSystemRedis: TowersSystemStateRedisService,
  ) {}

  @Get('overview')
  async overview(
    @Query() query: TowersOverviewQueryDto,
  ): Promise<TowersOverviewResponseDto> {
    const range: RollingAnalyticsPresetWithAll = query.range ?? '24h';
    return this.getTowersOverview.execute(range);
  }

  @Get('history')
  async history(
    @Query() query: TowersHistoryQueryDto,
  ): Promise<TowersHistoryResponseDto> {
    return this.getTowersHistory.execute({
      page: query.page,
      limit: query.limit,
      username: query.username,
      outcome: query.outcome,
      from: query.from,
      to: query.to,
    });
  }

  @Get('players')
  async players(@Query() query: TowersPlayersQueryDto) {
    return this.getTowersPlayers.execute({
      searchRaw: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('players/:username')
  async playerDetail(
    @Param('username') username: string,
  ): Promise<TowersPlayerDetailResponseDto> {
    return this.getTowersPlayerDetail.execute(username);
  }

  @Get('config')
  async configGet(): Promise<TowersConfigResponseDto> {
    return this.towersConfigRedis.read();
  }

  @Post('config')
  async configPost(
    @Body() body: TowersConfigUpdateDto,
  ): Promise<TowersConfigResponseDto> {
    if (!isValidTowersConfigNumbers(body.minBet, body.maxBet)) {
      throw new BadRequestException('Invalid minBet / maxBet');
    }
    const current = await this.towersConfigRedis.read();
    const merged = {
      ...current,
      minBet: body.minBet,
      maxBet: body.maxBet,
    };
    const parsed = parseTowersConfigFromUnknown(merged);
    if (!parsed) {
      throw new BadRequestException('Invalid towers config after merge');
    }
    return this.towersConfigRedis.write(parsed);
  }

  @Get('system-state')
  async systemStateGet(): Promise<TowersSystemStateResponseDto> {
    return this.towersSystemRedis.read();
  }

  @Post('system-state')
  async systemStatePost(
    @Body() body: TowersSystemStateUpdateDto,
  ): Promise<TowersSystemStateResponseDto> {
    return this.towersSystemRedis.write({ mode: body.mode });
  }
}
