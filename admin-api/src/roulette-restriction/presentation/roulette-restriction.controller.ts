import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { SetPlayerRestrictionUseCase } from '../application/set-player-restriction.use-case';
import { BanPlayerUseCase } from '../application/ban-player.use-case';
import { UnbanPlayerUseCase } from '../application/unban-player.use-case';
import { GetPlayerRestrictionUseCase } from '../application/get-player-restriction.use-case';
import { DeletePlayerRestrictionUseCase } from '../application/delete-player-restriction.use-case';
import { SetRouletteRestrictionBodyDto } from './dto/set-roulette-restriction.body.dto';
import { BanRoulettePlayerBodyDto } from './dto/ban-roulette-player.body.dto';
import type { RouletteRestrictionResponseDto } from './dto/roulette-restriction.response.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/roulette/restrictions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoles.ADMIN, UserRoles.OWNER, UserRoles.MODERATOR)
export class RouletteRestrictionController {
  constructor(
    private readonly setPlayerRestriction: SetPlayerRestrictionUseCase,
    private readonly banPlayer: BanPlayerUseCase,
    private readonly unbanPlayer: UnbanPlayerUseCase,
    private readonly getPlayerRestriction: GetPlayerRestrictionUseCase,
    private readonly deletePlayerRestriction: DeletePlayerRestrictionUseCase,
  ) {}

  @Get(':username')
  async get(
    @Param('username') username: string,
  ): Promise<RouletteRestrictionResponseDto> {
    const r = await this.getPlayerRestriction.execute(username);
    return {
      username,
      restriction:
        r == null
          ? null
          : {
              isBanned: r.isBanned(),
              banReason: r.toSnapshot().banReason,
              maxWagerAmount: r.getMaxWagerAmount(),
              timeframe: r.getTimeframe(),
            },
    };
  }

  @Post(':username')
  @HttpCode(HttpStatus.OK)
  async set(
    @Param('username') username: string,
    @Body() body: SetRouletteRestrictionBodyDto,
  ): Promise<RouletteRestrictionResponseDto> {
    const r = await this.setPlayerRestriction.execute(username, {
      isBanned: body.isBanned,
      banReason: body.banReason ?? null,
      maxWagerAmount: body.maxWagerAmount ?? null,
      timeframe: body.timeframe ?? null,
    });
    const s = r.toSnapshot();
    return {
      username,
      restriction: {
        isBanned: s.banned,
        banReason: s.banReason,
        maxWagerAmount: s.maxWagerAmount,
        timeframe: s.timeframe,
      },
    };
  }

  @Post(':username/ban')
  @HttpCode(HttpStatus.OK)
  async ban(
    @Param('username') username: string,
    @Body() body: BanRoulettePlayerBodyDto,
  ): Promise<RouletteRestrictionResponseDto> {
    const r = await this.banPlayer.execute(username, body.reason ?? null);
    const s = r.toSnapshot();
    return {
      username,
      restriction: {
        isBanned: s.banned,
        banReason: s.banReason,
        maxWagerAmount: s.maxWagerAmount,
        timeframe: s.timeframe,
      },
    };
  }

  @Post(':username/unban')
  @HttpCode(HttpStatus.OK)
  async unban(
    @Param('username') username: string,
  ): Promise<RouletteRestrictionResponseDto> {
    const r = await this.unbanPlayer.execute(username);
    return {
      username,
      restriction:
        r == null
          ? null
          : {
              isBanned: r.isBanned(),
              banReason: r.toSnapshot().banReason,
              maxWagerAmount: r.getMaxWagerAmount(),
              timeframe: r.getTimeframe(),
            },
    };
  }

  @Delete(':username')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('username') username: string): Promise<void> {
    await this.deletePlayerRestriction.execute(username);
  }
}
