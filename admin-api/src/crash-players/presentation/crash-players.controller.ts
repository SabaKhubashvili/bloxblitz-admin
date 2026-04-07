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
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { resolveCrashPlayersTimeWindow } from '../application/resolve-crash-players-time-window';
import { BanCrashPlayerUseCase } from '../application/ban-crash-player.use-case';
import { ClearCrashPlayerRestrictionsUseCase } from '../application/clear-crash-player-restrictions.use-case';
import { LimitCrashPlayerUseCase } from '../application/limit-crash-player.use-case';
import { ListCrashPlayersUseCase } from '../application/list-crash-players.use-case';
import { BanCrashPlayerBodyDto } from './dto/ban-crash-player.body.dto';
import { CrashPlayersListQueryDto } from './dto/crash-players-list.query.dto';
import { LimitCrashPlayerBodyDto } from './dto/limit-crash-player.body.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/crash/players')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CrashPlayersController {
  constructor(
    private readonly listCrashPlayers: ListCrashPlayersUseCase,
    private readonly banCrashPlayer: BanCrashPlayerUseCase,
    private readonly limitCrashPlayer: LimitCrashPlayerUseCase,
    private readonly clearCrashPlayerRestrictions: ClearCrashPlayerRestrictionsUseCase,
  ) {}

  @Get()
  async list(@Query() query: CrashPlayersListQueryDto) {
    const preset = query.range ?? '30d';
    if (preset === 'custom' && (!query.from || !query.to)) {
      throw new BadRequestException(
        'Custom range requires both `from` and `to` (ISO-8601).',
      );
    }

    const customFrom = preset === 'custom' ? new Date(query.from!) : undefined;
    const customTo = preset === 'custom' ? new Date(query.to!) : undefined;
    if (
      preset === 'custom' &&
      customFrom &&
      customTo &&
      customFrom.getTime() >= customTo.getTime()
    ) {
      throw new BadRequestException('`from` must be before `to`.');
    }

    const { from, to } = resolveCrashPlayersTimeWindow(
      preset,
      new Date(),
      customFrom && customTo ? { from: customFrom, to: customTo } : undefined,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.listCrashPlayers.execute({
      from,
      to,
      search: query.search,
      status: query.status,
      page,
      limit,
      sort: query.sort ?? 'totalWagered',
      order: query.order ?? 'desc',
    });

    return {
      ...result,
      page,
      limit,
    };
  }

  @Post(':username/ban')
  @HttpCode(HttpStatus.OK)
  async ban(
    @Param('username') usernameParam: string,
    @Body() body: BanCrashPlayerBodyDto,
  ) {
    const username = normalizeUsernameParam(usernameParam);
    return this.banCrashPlayer.execute(username, body.note);
  }

  @Post(':username/limit')
  @HttpCode(HttpStatus.OK)
  async limit(
    @Param('username') usernameParam: string,
    @Body() body: LimitCrashPlayerBodyDto,
  ) {
    const username = normalizeUsernameParam(usernameParam);
    return this.limitCrashPlayer.execute(username, {
      maxBetAmount: body.maxBetAmount,
      minSecondsBetweenBets: body.minSecondsBetweenBets,
      note: body.note,
    });
  }

  @Post(':username/clear-restrictions')
  @HttpCode(HttpStatus.OK)
  async clearRestrictions(@Param('username') usernameParam: string) {
    const username = normalizeUsernameParam(usernameParam);
    return this.clearCrashPlayerRestrictions.execute(username);
  }
}

function normalizeUsernameParam(raw: string): string {
  const username = decodeURIComponent(raw).trim();
  if (!username.length || username.length > 64) {
    throw new BadRequestException('Invalid username.');
  }
  return username;
}
