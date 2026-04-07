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
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetMinesHistoryUseCase } from '../application/get-mines-history.use-case';
import { GetMinesOverviewUseCase } from '../application/get-mines-overview.use-case';
import { GetMinesPlayerHistoryUseCase } from '../application/get-mines-player-history.use-case';
import { GetMinesPlayersUseCase } from '../application/get-mines-players.use-case';
import { normalizeMinesAdminUsernameParam } from '../common/mines-admin-username';
import { isValidMinesConfigNumbers } from '../domain/mines-config.validation';
import { MinesHistoryQueryDto } from './dto/mines-history.query.dto';
import type { MinesHistoryResponseDto } from './dto/mines-history.response.dto';
import type { MinesConfigResponseDto } from './dto/mines-config.response.dto';
import { MinesConfigUpdateDto } from './dto/mines-config.update.dto';
import { MinesOverviewQueryDto } from './dto/mines-overview.query.dto';
import type { MinesOverviewResponseDto } from './dto/mines-overview.response.dto';
import { MinesConfigRedisService } from '../infrastructure/mines-config.redis.service';
import type {
  MinesPlayerHistoryResponseDto,
  MinesPlayersResponseDto,
} from '../application/dto/mines-players.out.dto';
import { MinesPlayersQueryDto } from './dto/mines-players.query.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/mines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class MinesOverviewController {
  constructor(
    private readonly getMinesOverview: GetMinesOverviewUseCase,
    private readonly getMinesHistory: GetMinesHistoryUseCase,
    private readonly getMinesPlayers: GetMinesPlayersUseCase,
    private readonly getMinesPlayerHistory: GetMinesPlayerHistoryUseCase,
    private readonly minesConfigRedis: MinesConfigRedisService,
  ) {}

  @Get('overview')
  async overview(
    @Query() query: MinesOverviewQueryDto,
  ): Promise<MinesOverviewResponseDto> {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getMinesOverview.execute(range);
  }

  @Get('history')
  async history(
    @Query() query: MinesHistoryQueryDto,
  ): Promise<MinesHistoryResponseDto> {
    const limit = query.limit ?? 20;
    return this.getMinesHistory.execute(limit);
  }

  @Get('players')
  async players(
    @Query() query: MinesPlayersQueryDto,
  ): Promise<MinesPlayersResponseDto> {
    const moderation =
      query.moderationStatus === 'all' || query.moderationStatus === undefined
        ? 'all'
        : query.moderationStatus;
    return this.getMinesPlayers.execute({
      searchRaw: query.search,
      moderationStatus: moderation,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('players/:username/history')
  async playerHistory(
    @Param('username') username: string,
  ): Promise<MinesPlayerHistoryResponseDto> {
    const u = normalizeMinesAdminUsernameParam(username);
    if (!u) {
      throw new BadRequestException('Invalid username');
    }
    return this.getMinesPlayerHistory.execute(u);
  }

  @Get('config')
  async minesConfigGet(): Promise<MinesConfigResponseDto> {
    return this.minesConfigRedis.read();
  }

  @Post('config')
  async minesConfigPost(
    @Body() body: MinesConfigUpdateDto,
  ): Promise<MinesConfigResponseDto> {
    if (
      !isValidMinesConfigNumbers(
        body.minBet,
        body.maxBet,
        body.houseEdge,
        body.rtpTarget,
      )
    ) {
      throw new BadRequestException(
        'Invalid mines config: minBet, maxBet, houseEdge, and rtpTarget must follow product rules',
      );
    }
    return this.minesConfigRedis.write({
      minBet: body.minBet,
      maxBet: body.maxBet,
      houseEdge: body.houseEdge,
      rtpTarget: body.rtpTarget,
    });
  }
}
