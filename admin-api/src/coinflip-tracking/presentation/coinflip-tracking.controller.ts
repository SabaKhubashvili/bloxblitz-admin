import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetCoinflipOverviewUseCase } from '../application/get-coinflip-overview.use-case';
import { GetCoinflipHistoryUseCase } from '../application/get-coinflip-history.use-case';
import { CoinflipActiveGamesRedisReader } from '../infrastructure/coinflip-active-games.redis';
import { CoinflipHistoryQueryDto } from './dto/coinflip-history.query.dto';
import type { CoinflipHistoryResponseDto } from './dto/coinflip-history.response.dto';
import { CoinflipOverviewQueryDto } from './dto/coinflip-overview.query.dto';
import type { CoinflipOverviewResponseDto } from './dto/coinflip-overview.response.dto';
import type { CoinflipActiveGamesResponseDto } from './dto/coinflip-active-games.response.dto';
import { CancelCoinflipGameDto } from './dto/cancel-coinflip-game.dto';
import type { CoinflipEconomyConfig } from '../domain/coinflip-economy-config';
import { GetCoinflipEconomyConfigUseCase } from '../application/get-coinflip-economy-config.use-case';
import { UpdateCoinflipEconomyConfigUseCase } from '../application/update-coinflip-economy-config.use-case';
import {
  coinflipEconomyBodyToPatch,
  UpdateCoinflipEconomyConfigBodyDto,
} from './dto/update-coinflip-economy-config.body.dto';

/**
 * Staff JWT routes must not count against `login` / `twoFactor` throttlers
 * (those apply to every request globally unless skipped — 5 req/min would
 * break polling for active games).
 */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/coinflip')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CoinflipTrackingController {
  constructor(
    private readonly getCoinflipOverview: GetCoinflipOverviewUseCase,
    private readonly getCoinflipHistory: GetCoinflipHistoryUseCase,
    private readonly coinflipActiveRedis: CoinflipActiveGamesRedisReader,
    private readonly getCoinflipEconomyConfig: GetCoinflipEconomyConfigUseCase,
    private readonly updateCoinflipEconomyConfig: UpdateCoinflipEconomyConfigUseCase,
  ) {}

  @Get('overview')
  async overview(
    @Query() query: CoinflipOverviewQueryDto,
  ): Promise<CoinflipOverviewResponseDto> {
    const range: RollingAnalyticsPreset = query.range ?? '24h';
    return this.getCoinflipOverview.execute(range);
  }

  @Get('active-games')
  async activeGames(): Promise<CoinflipActiveGamesResponseDto> {
    const games = await this.coinflipActiveRedis.listActiveGames();
    return { games };
  }

  @Get('history')
  async history(
    @Query() query: CoinflipHistoryQueryDto,
  ): Promise<CoinflipHistoryResponseDto> {
    return this.getCoinflipHistory.execute(query);
  }

  @Get('economy')
  async economy(): Promise<CoinflipEconomyConfig> {
    return this.getCoinflipEconomyConfig.execute();
  }

  @Post('economy')
  async economyUpdate(
    @Body() body: UpdateCoinflipEconomyConfigBodyDto,
  ): Promise<CoinflipEconomyConfig> {
    return this.updateCoinflipEconomyConfig.execute(coinflipEconomyBodyToPatch(body));
  }

  @Post('cancel')
  async cancel(
    @Body() body: CancelCoinflipGameDto,
  ): Promise<{ ok: true; message: string }> {
    const result = await this.coinflipActiveRedis.cancelWaitingGame(body.gameId);
    switch (result) {
      case 'ok':
        return { ok: true, message: 'Game cancelled and creator refunded.' };
      case 'not_found':
        throw new NotFoundException(
          'Game not found or already finished.',
        );
      case 'already_started':
        throw new ConflictException(
          'Game already has two players or is in progress. Cannot cancel via admin refund.',
        );
      case 'invalid_payload':
        throw new UnprocessableEntityException('Invalid game data in Redis.');
      default:
        throw new ServiceUnavailableException('Could not cancel game.');
    }
  }
}
