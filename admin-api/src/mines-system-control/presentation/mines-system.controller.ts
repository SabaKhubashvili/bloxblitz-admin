import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { DisableMinesGamesUseCase } from '../application/disable-mines-games.use-case';
import { GetMinesSystemStateUseCase } from '../application/get-mines-system-state.use-case';
import { PauseMinesUseCase } from '../application/pause-mines.use-case';
import { ResetActiveMinesGamesUseCase } from '../application/reset-active-mines-games.use-case';
import { ResumeMinesUseCase } from '../application/resume-mines.use-case';
import type { MinesSystemStatePayload } from '../domain/mines-system-state';
import type { ResetActiveMinesSummaryDto } from '../application/dto/reset-active-mines.out.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/mines/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class MinesSystemController {
  constructor(
    private readonly getState: GetMinesSystemStateUseCase,
    private readonly disableMines: DisableMinesGamesUseCase,
    private readonly pauseMines: PauseMinesUseCase,
    private readonly resumeMines: ResumeMinesUseCase,
    private readonly resetActive: ResetActiveMinesGamesUseCase,
  ) {}

  @Get()
  async status(): Promise<MinesSystemStatePayload> {
    return this.getState.execute();
  }

  @Post('disable-new-games')
  async disableNewGames(): Promise<MinesSystemStatePayload> {
    return this.disableMines.execute();
  }

  @Post('pause')
  async pause(): Promise<MinesSystemStatePayload> {
    return this.pauseMines.execute();
  }

  @Post('resume')
  async resume(): Promise<MinesSystemStatePayload> {
    return this.resumeMines.execute();
  }

  @Post('reset-active-games')
  async resetActiveGames(): Promise<ResetActiveMinesSummaryDto> {
    return this.resetActive.execute();
  }
}
