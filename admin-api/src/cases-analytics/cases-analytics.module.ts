import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GetCaseAnalyticsUseCase } from './application/get-case-analytics.use-case';
import { CASE_ANALYTICS_REPOSITORY } from './infrastructure/case-analytics.tokens';
import { PrismaCaseAnalyticsRepository } from './infrastructure/prisma-case-analytics.repository';
import { CaseAnalyticsController } from './presentation/case-analytics.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CaseAnalyticsController],
  providers: [
    PrismaCaseAnalyticsRepository,
    {
      provide: CASE_ANALYTICS_REPOSITORY,
      useExisting: PrismaCaseAnalyticsRepository,
    },
    GetCaseAnalyticsUseCase,
  ],
})
export class CasesAnalyticsModule {}
