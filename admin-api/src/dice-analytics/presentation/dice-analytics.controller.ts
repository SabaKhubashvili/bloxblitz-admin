import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { GetDiceAnalyticsUseCase } from '../application/get-dice-analytics.use-case';
import { GetDiceConfigUseCase } from '../application/get-dice-config.use-case';
import { GetRecentDiceGamesUseCase } from '../application/get-recent-dice-games.use-case';
import { UpdateDiceConfigUseCase } from '../application/update-dice-config.use-case';
import { GetDicePlayersUseCase } from '../application/get-dice-players.use-case';
import { BanDicePlayerUseCase } from '../application/ban-dice-player.use-case';
import { UnbanDicePlayerUseCase } from '../application/unban-dice-player.use-case';
import { LimitDicePlayerUseCase } from '../application/limit-dice-player.use-case';
import { UnlimitDicePlayerUseCase } from '../application/unlimit-dice-player.use-case';
import { DiceAnalyticsQueryDto } from './dto/dice-analytics.query.dto';
import type { DiceAnalyticsResponseDto } from './dto/dice-analytics.response.dto';
import { DiceRecentGamesQueryDto } from './dto/dice-recent-games.query.dto';
import type { RecentDiceGamesResponseDto } from './dto/dice-recent-games.response.dto';
import type { DiceConfigResponseDto } from './dto/dice-config.response.dto';
import { DiceConfigUpdateDto } from './dto/dice-config.update.dto';
import { DicePlayersQueryDto } from './dto/dice-players.query.dto';
import type {
  DicePlayerStatsDto,
  DicePlayersResponseDto,
} from './dto/dice-players.response.dto';
import { BanDicePlayerBodyDto } from './dto/dice-player-ban.body.dto';
import { LimitDicePlayerBodyDto } from './dto/dice-player-limit.body.dto';
import {
  GetDiceBettingStatusUseCase,
  type DiceBettingStatusDto,
} from '../application/get-dice-betting-status.use-case';
import { DisableDiceBettingUseCase } from '../application/disable-dice-betting.use-case';
import { EnableDiceBettingUseCase } from '../application/enable-dice-betting.use-case';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/dice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class DiceAnalyticsController {
  constructor(
    private readonly getDiceAnalytics: GetDiceAnalyticsUseCase,
    private readonly getRecentDiceGames: GetRecentDiceGamesUseCase,
    private readonly getDiceConfig: GetDiceConfigUseCase,
    private readonly updateDiceConfig: UpdateDiceConfigUseCase,
    private readonly getDicePlayers: GetDicePlayersUseCase,
    private readonly banDicePlayer: BanDicePlayerUseCase,
    private readonly unbanDicePlayer: UnbanDicePlayerUseCase,
    private readonly limitDicePlayer: LimitDicePlayerUseCase,
    private readonly unlimitDicePlayer: UnlimitDicePlayerUseCase,
    private readonly getDiceBettingStatus: GetDiceBettingStatusUseCase,
    private readonly disableDiceBetting: DisableDiceBettingUseCase,
    private readonly enableDiceBetting: EnableDiceBettingUseCase,
  ) {}

  @Get('betting/status')
  async diceBettingStatus(): Promise<DiceBettingStatusDto> {
    return this.getDiceBettingStatus.execute();
  }

  @Post('betting/disable')
  @HttpCode(HttpStatus.OK)
  async diceBettingDisable(): Promise<DiceBettingStatusDto> {
    return this.disableDiceBetting.execute();
  }

  @Post('betting/enable')
  @HttpCode(HttpStatus.OK)
  async diceBettingEnable(): Promise<DiceBettingStatusDto> {
    return this.enableDiceBetting.execute();
  }

  @Get('analytics')
  async analytics(
    @Query() query: DiceAnalyticsQueryDto,
  ): Promise<DiceAnalyticsResponseDto> {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getDiceAnalytics.execute(range);
  }

  @Get('recent-games')
  async recentGames(
    @Query() query: DiceRecentGamesQueryDto,
  ): Promise<RecentDiceGamesResponseDto> {
    return this.getRecentDiceGames.execute(query);
  }

  @Get('players')
  async dicePlayers(
    @Query() query: DicePlayersQueryDto,
  ): Promise<DicePlayersResponseDto> {
    return this.getDicePlayers.execute(query);
  }

  @Post('players/:username/ban')
  @HttpCode(HttpStatus.OK)
  async banDicePlayerRoute(
    @Param('username') usernameRaw: string,
    @Body() body: BanDicePlayerBodyDto,
  ): Promise<DicePlayerStatsDto> {
    const username = normalizeUsernameParam(usernameRaw);
    return this.banDicePlayer.execute(username, body.reason);
  }

  @Post('players/:username/unban')
  @HttpCode(HttpStatus.OK)
  async unbanDicePlayerRoute(
    @Param('username') usernameRaw: string,
  ): Promise<DicePlayerStatsDto> {
    const username = normalizeUsernameParam(usernameRaw);
    return this.unbanDicePlayer.execute(username);
  }

  @Post('players/:username/limit')
  @HttpCode(HttpStatus.OK)
  async limitDicePlayerRoute(
    @Param('username') usernameRaw: string,
    @Body() body: LimitDicePlayerBodyDto,
  ): Promise<DicePlayerStatsDto> {
    const username = normalizeUsernameParam(usernameRaw);
    return this.limitDicePlayer.execute(
      username,
      body.maxBet,
      body.reason,
    );
  }

  @Post('players/:username/unlimit')
  @HttpCode(HttpStatus.OK)
  async unlimitDicePlayerRoute(
    @Param('username') usernameRaw: string,
  ): Promise<DicePlayerStatsDto> {
    const username = normalizeUsernameParam(usernameRaw);
    return this.unlimitDicePlayer.execute(username);
  }

  @Get('config')
  async diceConfigGet(): Promise<DiceConfigResponseDto> {
    return this.getDiceConfig.execute();
  }

  @Post('config')
  async diceConfigPost(
    @Body() body: DiceConfigUpdateDto,
  ): Promise<DiceConfigResponseDto> {
    return this.updateDiceConfig.execute(body);
  }
}

function normalizeUsernameParam(raw: string): string {
  let username: string;
  try {
    username = decodeURIComponent(raw).trim();
  } catch {
    throw new BadRequestException('Invalid username.');
  }
  if (!username.length || username.length > 64) {
    throw new BadRequestException('Invalid username.');
  }
  return username;
}
