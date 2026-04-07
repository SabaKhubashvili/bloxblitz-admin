import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GetCasesOpeningsChartUseCase } from './application/get-cases-openings-chart.use-case';
import { GetCasesPopularUseCase } from './application/get-cases-popular.use-case';
import { GetCasesRevenueChartUseCase } from './application/get-cases-revenue-chart.use-case';
import { CASES_CHARTS_REPOSITORY } from './infrastructure/cases-charts.tokens';
import { PrismaCasesChartsRepository } from './infrastructure/prisma-cases-charts.repository';
import { CasesChartsController } from './presentation/cases-charts.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CasesChartsController],
  providers: [
    PrismaCasesChartsRepository,
    {
      provide: CASES_CHARTS_REPOSITORY,
      useExisting: PrismaCasesChartsRepository,
    },
    GetCasesRevenueChartUseCase,
    GetCasesOpeningsChartUseCase,
    GetCasesPopularUseCase,
  ],
})
export class CasesChartsModule {}
