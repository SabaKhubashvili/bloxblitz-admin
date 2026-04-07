import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GetMonthlyGgrChartUseCase } from './application/get-monthly-ggr-chart.use-case';
import { GetStatisticsChartUseCase } from './application/get-statistics-chart.use-case';
import { GetWageringStatsUseCase } from './application/get-wagering-stats.use-case';
import { PrismaWageringStatsRepository } from './infrastructure/prisma-wagering-stats.repository';
import { WAGERING_STATS_REPOSITORY } from './infrastructure/wagering-stats.tokens';
import { WageringAnalyticsController } from './presentation/wagering-analytics.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WageringAnalyticsController],
  providers: [
    PrismaWageringStatsRepository,
    {
      provide: WAGERING_STATS_REPOSITORY,
      useExisting: PrismaWageringStatsRepository,
    },
    GetWageringStatsUseCase,
    GetMonthlyGgrChartUseCase,
    GetStatisticsChartUseCase,
  ],
})
export class AnalyticsModule {}
