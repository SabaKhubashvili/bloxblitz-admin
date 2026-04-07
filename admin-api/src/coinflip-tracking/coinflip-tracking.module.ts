import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { GetCoinflipOverviewUseCase } from './application/get-coinflip-overview.use-case';
import { GetCoinflipHistoryUseCase } from './application/get-coinflip-history.use-case';
import { CoinflipHistoryService } from './application/coinflip-history.service';
import { CoinflipActiveGamesRedisReader } from './infrastructure/coinflip-active-games.redis';
import { PrismaCoinflipOverviewRepository } from './infrastructure/prisma-coinflip-overview.repository';
import { COINFLIP_OVERVIEW_REPOSITORY } from './infrastructure/coinflip-tracking.tokens';
import { CoinflipTrackingController } from './presentation/coinflip-tracking.controller';
import { CoinflipEconomyConfigRedisStore } from './infrastructure/coinflip-economy-config.redis';
import { CoinflipEconomyConfigService } from './application/coinflip-economy-config.service';
import { GetCoinflipEconomyConfigUseCase } from './application/get-coinflip-economy-config.use-case';
import { UpdateCoinflipEconomyConfigUseCase } from './application/update-coinflip-economy-config.use-case';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  controllers: [CoinflipTrackingController],
  providers: [
    CoinflipActiveGamesRedisReader,
    CoinflipEconomyConfigRedisStore,
    CoinflipEconomyConfigService,
    GetCoinflipEconomyConfigUseCase,
    UpdateCoinflipEconomyConfigUseCase,
    PrismaCoinflipOverviewRepository,
    {
      provide: COINFLIP_OVERVIEW_REPOSITORY,
      useExisting: PrismaCoinflipOverviewRepository,
    },
    GetCoinflipOverviewUseCase,
    CoinflipHistoryService,
    GetCoinflipHistoryUseCase,
  ],
})
export class CoinflipTrackingModule {}
