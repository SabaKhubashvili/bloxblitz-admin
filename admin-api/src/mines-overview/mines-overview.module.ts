import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MinesModerationModule } from '../mines-moderation/mines-moderation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { GetMinesHistoryUseCase } from './application/get-mines-history.use-case';
import { GetMinesOverviewUseCase } from './application/get-mines-overview.use-case';
import { GetMinesPlayerHistoryUseCase } from './application/get-mines-player-history.use-case';
import { GetMinesPlayersUseCase } from './application/get-mines-players.use-case';
import { MinesConfigRedisService } from './infrastructure/mines-config.redis.service';
import { PrismaMinesOverviewRepository } from './infrastructure/prisma-mines-overview.repository';
import { MINES_OVERVIEW_REPOSITORY } from './infrastructure/mines-overview.tokens';
import { MinesOverviewController } from './presentation/mines-overview.controller';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule, MinesModerationModule],
  controllers: [MinesOverviewController],
  providers: [
    MinesConfigRedisService,
    PrismaMinesOverviewRepository,
    {
      provide: MINES_OVERVIEW_REPOSITORY,
      useExisting: PrismaMinesOverviewRepository,
    },
    GetMinesOverviewUseCase,
    GetMinesHistoryUseCase,
    GetMinesPlayersUseCase,
    GetMinesPlayerHistoryUseCase,
  ],
})
export class MinesOverviewModule {}
