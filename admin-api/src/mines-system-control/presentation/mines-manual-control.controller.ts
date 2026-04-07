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
import { ToggleMinesNewGamesUseCase } from '../application/toggle-mines-new-games.use-case';
import type { MinesSystemStatePayload } from '../domain/mines-system-state';
import type { MinesSystemStateClientDto } from './dto/mines-system-state.response.dto';
import { toClientSystemState } from './dto/mines-system-state.response.dto';
import type { ResetActiveMinesSummaryDto } from '../application/dto/reset-active-mines.out.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/mines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class MinesManualControlController {
  constructor(
    private readonly getState: GetMinesSystemStateUseCase,
    private readonly pauseMines: PauseMinesUseCase,
    private readonly resumeMines: ResumeMinesUseCase,
    private readonly disableMines: DisableMinesGamesUseCase,
    private readonly toggleNewGames: ToggleMinesNewGamesUseCase,
    private readonly resetActive: ResetActiveMinesGamesUseCase,
  ) {}

  @Get('system-state')
  async systemState(): Promise<MinesSystemStateClientDto> {
    const payload = await this.getState.execute();
    return toClientSystemState(payload);
  }

  @Post('pause')
  async pause(): Promise<MinesSystemStatePayload> {
    return this.pauseMines.execute();
  }

  @Post('resume')
  async resume(): Promise<MinesSystemStatePayload> {
    return this.resumeMines.execute();
  }

  /**
   * Disable new games only (existing rounds continue). Idempotent when already paused.
   */
  @Post('disable-new-games')
  async disableNewGames(): Promise<MinesSystemStatePayload> {
    return this.disableMines.execute();
  }

  @Post('toggle-new-games')
  async toggleNewGamesRoute(): Promise<MinesSystemStatePayload> {
    return this.toggleNewGames.execute();
  }

  @Post('reset-active')
  async resetActiveGames(): Promise<ResetActiveMinesSummaryDto> {
    return this.resetActive.execute();
  }
}
