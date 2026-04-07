import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { PrismaRacesRepository } from './infrastructure/prisma-races.repository';
import { RACES_REPOSITORY } from './infrastructure/races.tokens';
import { RaceLeaderboardRedisRepository } from './infrastructure/race-leaderboard.redis.repository';
import { GetRaceOverviewUseCase } from './application/get-race-overview.use-case';
import { CreateRaceUseCase } from './application/create-race.use-case';
import { EndRaceUseCase } from './application/end-race.use-case';
import { CancelRaceUseCase } from './application/cancel-race.use-case';
import { PauseRaceUseCase } from './application/pause-race.use-case';
import { ResumeRaceUseCase } from './application/resume-race.use-case';
import { PauseTrackingUseCase } from './application/pause-tracking.use-case';
import { ResumeTrackingUseCase } from './application/resume-tracking.use-case';
import { GetRaceHistoryUseCase } from './application/get-race-history.use-case';
import { RaceLifecycleCron } from './application/race-lifecycle.cron';
import { RacesController } from './presentation/races.controller';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  controllers: [RacesController],
  providers: [
    PrismaRacesRepository,
    {
      provide: RACES_REPOSITORY,
      useExisting: PrismaRacesRepository,
    },
    RaceLeaderboardRedisRepository,
    GetRaceOverviewUseCase,
    CreateRaceUseCase,
    EndRaceUseCase,
    CancelRaceUseCase,
    PauseRaceUseCase,
    ResumeRaceUseCase,
    PauseTrackingUseCase,
    ResumeTrackingUseCase,
    GetRaceHistoryUseCase,
    RaceLifecycleCron,
  ],
})
export class RacesModule {}
