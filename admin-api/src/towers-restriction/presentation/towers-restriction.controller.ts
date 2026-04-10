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
import { SetTowersRestrictionUseCase } from '../application/set-towers-restriction.use-case';
import { BanTowersPlayerUseCase } from '../application/ban-towers-player.use-case';
import { UnbanTowersPlayerUseCase } from '../application/unban-towers-player.use-case';
import { GetTowersRestrictionUseCase } from '../application/get-towers-restriction.use-case';
import { DeleteTowersRestrictionUseCase } from '../application/delete-towers-restriction.use-case';
import { SetTowersRestrictionBodyDto } from './dto/set-towers-restriction.body.dto';
import { BanTowersPlayerBodyDto } from './dto/ban-towers-player.body.dto';
import type { TowersRestrictionResponseDto } from './dto/towers-restriction.response.dto';

function toInfo(r: {
  isBanned(): boolean;
  toSnapshot(): {
    banReason: string | null;
    dailyWagerLimit: number | null;
    weeklyWagerLimit: number | null;
    monthlyWagerLimit: number | null;
    limitReason: string | null;
  };
}) {
  const s = r.toSnapshot();
  return {
    isBanned: r.isBanned(),
    banReason: s.banReason,
    dailyWagerLimit: s.dailyWagerLimit,
    weeklyWagerLimit: s.weeklyWagerLimit,
    monthlyWagerLimit: s.monthlyWagerLimit,
    limitReason: s.limitReason,
  };
}

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/towers/restrictions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoles.ADMIN, UserRoles.OWNER, UserRoles.MODERATOR)
export class TowersRestrictionController {
  constructor(
    private readonly setRestriction: SetTowersRestrictionUseCase,
    private readonly banPlayer: BanTowersPlayerUseCase,
    private readonly unbanPlayer: UnbanTowersPlayerUseCase,
    private readonly getRestriction: GetTowersRestrictionUseCase,
    private readonly deleteRestriction: DeleteTowersRestrictionUseCase,
  ) {}

  @Get(':username')
  async get(
    @Param('username') username: string,
  ): Promise<TowersRestrictionResponseDto> {
    const r = await this.getRestriction.execute(username);
    return {
      username,
      restriction: r == null ? null : toInfo(r),
    };
  }

  @Post(':username')
  @HttpCode(HttpStatus.OK)
  async set(
    @Param('username') username: string,
    @Body() body: SetTowersRestrictionBodyDto,
  ): Promise<TowersRestrictionResponseDto> {
    const r = await this.setRestriction.execute(username, {
      isBanned: body.isBanned,
      banReason: body.banReason ?? null,
      dailyWagerLimit: body.dailyWagerLimit ?? null,
      weeklyWagerLimit: body.weeklyWagerLimit ?? null,
      monthlyWagerLimit: body.monthlyWagerLimit ?? null,
      limitReason: body.limitReason ?? null,
    });
    return {
      username,
      restriction: toInfo(r),
    };
  }

  @Post(':username/ban')
  @HttpCode(HttpStatus.OK)
  async ban(
    @Param('username') username: string,
    @Body() body: BanTowersPlayerBodyDto,
  ): Promise<TowersRestrictionResponseDto> {
    const r = await this.banPlayer.execute(
      username,
      body.reason?.trim().slice(0, 500) || null,
    );
    return {
      username,
      restriction: toInfo(r),
    };
  }

  @Post(':username/unban')
  @HttpCode(HttpStatus.OK)
  async unban(
    @Param('username') username: string,
  ): Promise<TowersRestrictionResponseDto> {
    const r = await this.unbanPlayer.execute(username);
    return {
      username,
      restriction: r == null ? null : toInfo(r),
    };
  }

  @Delete(':username')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('username') username: string): Promise<void> {
    await this.deleteRestriction.execute(username);
  }
}
