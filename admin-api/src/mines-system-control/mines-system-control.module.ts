import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { DisableMinesGamesUseCase } from './application/disable-mines-games.use-case';
import { GetMinesSystemStateUseCase } from './application/get-mines-system-state.use-case';
import { PauseMinesUseCase } from './application/pause-mines.use-case';
import { ResetActiveMinesGamesUseCase } from './application/reset-active-mines-games.use-case';
import { ResumeMinesUseCase } from './application/resume-mines.use-case';
import { MinesActiveGamesScanner } from './infrastructure/mines-active-games.scanner';
import { MinesAdminRefundRedisService } from './infrastructure/mines-admin-refund.redis';
import { MinesSystemStateRedisService } from './infrastructure/mines-system-state.redis.service';
import { MinesManualControlController } from './presentation/mines-manual-control.controller';
import { MinesSystemController } from './presentation/mines-system.controller';
import { ToggleMinesNewGamesUseCase } from './application/toggle-mines-new-games.use-case';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [MinesSystemController, MinesManualControlController],
  providers: [
    MinesSystemStateRedisService,
    MinesActiveGamesScanner,
    MinesAdminRefundRedisService,
    DisableMinesGamesUseCase,
    ToggleMinesNewGamesUseCase,
    PauseMinesUseCase,
    ResumeMinesUseCase,
    ResetActiveMinesGamesUseCase,
    GetMinesSystemStateUseCase,
  ],
})
export class MinesSystemControlModule {}
