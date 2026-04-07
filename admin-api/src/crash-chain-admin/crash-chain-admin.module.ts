import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CrashChainAdminController } from './crash-chain-admin.controller';
import { CrashChainAdminService } from './crash-chain-admin.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CrashChainAdminController],
  providers: [CrashChainAdminService],
})
export class CrashChainAdminModule {}
