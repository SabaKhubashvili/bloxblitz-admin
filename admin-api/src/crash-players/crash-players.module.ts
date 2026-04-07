import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BanCrashPlayerUseCase } from './application/ban-crash-player.use-case';
import { ClearCrashPlayerRestrictionsUseCase } from './application/clear-crash-player-restrictions.use-case';
import { CrashPlayerBetEligibilityService } from './application/crash-player-bet-eligibility.service';
import { LimitCrashPlayerUseCase } from './application/limit-crash-player.use-case';
import { ListCrashPlayersUseCase } from './application/list-crash-players.use-case';
import { CrashBetEligibilityCacheService } from './infrastructure/crash-bet-eligibility-cache.service';
import { PrismaCrashPlayersListRepository } from './infrastructure/prisma-crash-players-list.repository';
import { CrashPlayersController } from './presentation/crash-players.controller';
import { InternalCrashBetValidationController } from './presentation/internal-crash-bet-validation.controller';
import { InternalServiceKeyGuard } from './presentation/guards/internal-service-key.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CrashPlayersController, InternalCrashBetValidationController],
  providers: [
    CrashBetEligibilityCacheService,
    PrismaCrashPlayersListRepository,
    ListCrashPlayersUseCase,
    BanCrashPlayerUseCase,
    LimitCrashPlayerUseCase,
    ClearCrashPlayerRestrictionsUseCase,
    CrashPlayerBetEligibilityService,
    InternalServiceKeyGuard,
  ],
})
export class CrashPlayersModule {}
