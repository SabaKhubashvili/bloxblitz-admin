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
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { BanCoinflipPlayerUseCase } from '../application/ban-coinflip-player.use-case';
import { ClearCoinflipPlayerModerationUseCase } from '../application/clear-coinflip-player-moderation.use-case';
import { GetCoinflipPlayerHistoryUseCase } from '../application/get-coinflip-player-history.use-case';
import { GetCoinflipPlayerStatusUseCase } from '../application/get-coinflip-player-status.use-case';
import { LimitCoinflipPlayerUseCase } from '../application/limit-coinflip-player.use-case';
import { ListCoinflipPlayersUseCase } from '../application/list-coinflip-players.use-case';
import type { CoinflipPlayersListCriteria } from '../domain/coinflip-player-list.criteria';
import { BanCoinflipPlayerBodyDto } from './dto/ban-coinflip-player.body.dto';
import { CoinflipPlayerHistoryQueryDto } from './dto/coinflip-player-history.query.dto';
import { CoinflipPlayersListQueryDto } from './dto/coinflip-players-list.query.dto';
import { LimitCoinflipPlayerBodyDto } from './dto/limit-coinflip-player.body.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/coinflip/players')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CoinflipPlayersController {
  constructor(
    private readonly listPlayers: ListCoinflipPlayersUseCase,
    private readonly history: GetCoinflipPlayerHistoryUseCase,
    private readonly status: GetCoinflipPlayerStatusUseCase,
    private readonly ban: BanCoinflipPlayerUseCase,
    private readonly limit: LimitCoinflipPlayerUseCase,
    private readonly clearModeration: ClearCoinflipPlayerModerationUseCase,
  ) {}

  @Get()
  async list(@Query() query: CoinflipPlayersListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const criteria: CoinflipPlayersListCriteria = {
      page,
      limit,
      sort: query.sort ?? 'totalWagered',
      order: query.order ?? 'desc',
      userId: query.userId ?? null,
      searchUsername:
        query.userId != null ? null : (query.username?.trim() ?? null),
      status:
        query.status === 'all' || query.status === undefined
          ? undefined
          : query.status,
    };
    const result = await this.listPlayers.execute(criteria);
    return { ...result, page, limit };
  }

  @Get(':username/history')
  async playerHistory(
    @Param('username') usernameParam: string,
    @Query() query: CoinflipPlayerHistoryQueryDto,
  ) {
    const username = normalizeUsernameParam(usernameParam);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    return this.history.execute(username, page, limit);
  }

  @Get(':username/status')
  async playerStatus(@Param('username') usernameParam: string) {
    const username = normalizeUsernameParam(usernameParam);
    return this.status.execute(username);
  }

  @Post(':username/ban')
  @HttpCode(HttpStatus.OK)
  async banPlayer(
    @Param('username') usernameParam: string,
    @Body() body: BanCoinflipPlayerBodyDto,
  ) {
    const username = normalizeUsernameParam(usernameParam);
    return this.ban.execute(username, {
      reason: body.reason,
      untilIso: body.untilIso,
    });
  }

  @Post(':username/limit')
  @HttpCode(HttpStatus.OK)
  async limitPlayer(
    @Param('username') usernameParam: string,
    @Body() body: LimitCoinflipPlayerBodyDto,
  ) {
    const username = normalizeUsernameParam(usernameParam);
    return this.limit.execute(username, {
      maxWagerAmount: body.maxWagerAmount,
      note: body.note,
    });
  }

  @Post(':username/clear-moderation')
  @HttpCode(HttpStatus.OK)
  async clear(
    @Param('username') usernameParam: string,
  ) {
    const username = normalizeUsernameParam(usernameParam);
    return this.clearModeration.execute(username);
  }
}

function normalizeUsernameParam(raw: string): string {
  const username = decodeURIComponent(raw).trim();
  if (!username.length || username.length > 64) {
    throw new BadRequestException('Invalid username.');
  }
  return username;
}
