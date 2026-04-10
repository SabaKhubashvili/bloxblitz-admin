import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { GetTowersOverviewUseCase } from './application/get-towers-overview.use-case';
import { GetTowersHistoryUseCase } from './application/get-towers-history.use-case';
import { GetTowersPlayersUseCase } from './application/get-towers-players.use-case';
import { GetTowersPlayerDetailUseCase } from './application/get-towers-player-detail.use-case';
import { PrismaTowersOverviewRepository } from './infrastructure/prisma-towers-overview.repository';
import { TOWERS_OVERVIEW_REPOSITORY } from './infrastructure/towers-overview.tokens';
import { TowersConfigRedisService } from './infrastructure/towers-config.redis.service';
import { TowersSystemStateRedisService } from './infrastructure/towers-system-state.redis.service';
import { TowersAdminController } from './presentation/towers-admin.controller';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  controllers: [TowersAdminController],
  providers: [
    TowersConfigRedisService,
    TowersSystemStateRedisService,
    PrismaTowersOverviewRepository,
    {
      provide: TOWERS_OVERVIEW_REPOSITORY,
      useExisting: PrismaTowersOverviewRepository,
    },
    GetTowersOverviewUseCase,
    GetTowersHistoryUseCase,
    GetTowersPlayersUseCase,
    GetTowersPlayerDetailUseCase,
  ],
})
export class TowersAdminModule {}
