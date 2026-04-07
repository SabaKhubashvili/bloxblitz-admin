import {
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
import { GetRaceOverviewUseCase } from '../application/get-race-overview.use-case';
import { CreateRaceUseCase } from '../application/create-race.use-case';
import { EndRaceUseCase } from '../application/end-race.use-case';
import { CancelRaceUseCase } from '../application/cancel-race.use-case';
import { PauseRaceUseCase } from '../application/pause-race.use-case';
import { ResumeRaceUseCase } from '../application/resume-race.use-case';
import { PauseTrackingUseCase } from '../application/pause-tracking.use-case';
import { ResumeTrackingUseCase } from '../application/resume-tracking.use-case';
import { GetRaceHistoryUseCase } from '../application/get-race-history.use-case';
import { CreateRaceBodyDto } from './dto/create-race.body.dto';
import { RaceHistoryQueryDto } from './dto/race-history.query.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/races')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class RacesController {
  constructor(
    private readonly getRaceOverview: GetRaceOverviewUseCase,
    private readonly createRace: CreateRaceUseCase,
    private readonly endRace: EndRaceUseCase,
    private readonly cancelRace: CancelRaceUseCase,
    private readonly pauseRace: PauseRaceUseCase,
    private readonly resumeRace: ResumeRaceUseCase,
    private readonly pauseTracking: PauseTrackingUseCase,
    private readonly resumeTracking: ResumeTrackingUseCase,
    private readonly getRaceHistory: GetRaceHistoryUseCase,
  ) {}

  @Get('overview')
  async overview() {
    return this.getRaceOverview.execute();
  }

  @Get('history')
  async history(@Query() query: RaceHistoryQueryDto) {
    return this.getRaceHistory.execute(query.limit ?? 20);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateRaceBodyDto) {
    return this.createRace.execute({
      rewards: body.rewards.map((r) => ({
        position: r.position,
        rewardAmount: r.rewardAmount,
      })),
      startTime: body.startTime,
      endTime: body.endTime,
      raceWindow: body.raceWindow,
    });
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  async end(@Param('id') id: string) {
    await this.endRace.execute(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param('id') id: string) {
    await this.cancelRace.execute(id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.NO_CONTENT)
  async pause(@Param('id') id: string) {
    await this.pauseRace.execute(id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resume(@Param('id') id: string) {
    await this.resumeRace.execute(id);
  }

  @Post(':id/pause-tracking')
  @HttpCode(HttpStatus.NO_CONTENT)
  async pauseTrackingCtl(@Param('id') id: string) {
    await this.pauseTracking.execute(id);
  }

  @Post(':id/resume-tracking')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resumeTrackingCtl(@Param('id') id: string) {
    await this.resumeTracking.execute(id);
  }
}
