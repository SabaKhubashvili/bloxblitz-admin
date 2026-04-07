import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardCaseKeysAdminService } from './reward-case-keys-admin.service';
import { RewardCaseKeysAdminController } from './reward-case-keys-admin.controller';
import { RewardCasesModule } from '../reward-cases/reward-cases.module';

@Module({
  imports: [PrismaModule, RewardCasesModule],
  controllers: [RewardCaseKeysAdminController],
  providers: [RewardCaseKeysAdminService],
})
export class RewardCaseKeysAdminModule {}
