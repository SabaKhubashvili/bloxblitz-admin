import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardCasesAdminService } from './application/reward-cases-admin.service';
import { RewardCasesController } from './presentation/reward-cases.controller';
import { RewardCasesCacheInvalidator } from './infrastructure/reward-cases-cache-invalidator';

@Module({
  imports: [PrismaModule],
  controllers: [RewardCasesController],
  providers: [RewardCasesAdminService, RewardCasesCacheInvalidator],
  exports: [RewardCasesCacheInvalidator],
})
export class RewardCasesModule {}
