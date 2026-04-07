import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GetCrashMultiplierHistoryUseCase } from './application/get-crash-multiplier-history.use-case';
import { GetCrashPlayerActivityChartUseCase } from './application/get-crash-player-activity-chart.use-case';
import { GetCrashProfitLossChartUseCase } from './application/get-crash-profit-loss-chart.use-case';
import { GetCrashStatisticsOverviewUseCase } from './application/get-crash-statistics-overview.use-case';
import { CRASH_ANALYTICS_REPOSITORY } from './infrastructure/crash-analytics.tokens';
import { CrashRuntimeRedisService } from './infrastructure/crash-runtime-redis.service';
import { PrismaCrashAnalyticsRepository } from './infrastructure/prisma-crash-analytics.repository';
import { CrashControlRoomController } from './presentation/crash-control-room.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CrashControlRoomController],
  providers: [
    CrashRuntimeRedisService,
    PrismaCrashAnalyticsRepository,
    {
      provide: CRASH_ANALYTICS_REPOSITORY,
      useExisting: PrismaCrashAnalyticsRepository,
    },
    GetCrashStatisticsOverviewUseCase,
    GetCrashMultiplierHistoryUseCase,
    GetCrashProfitLossChartUseCase,
    GetCrashPlayerActivityChartUseCase,
  ],
})
export class CrashControlRoomModule {}
