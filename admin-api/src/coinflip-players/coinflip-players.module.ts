import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CoinflipBannedUserIdsModule } from '../coinflip-banned-user-ids/coinflip-banned-user-ids.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { BanCoinflipPlayerUseCase } from './application/ban-coinflip-player.use-case';
import { ClearCoinflipPlayerModerationUseCase } from './application/clear-coinflip-player-moderation.use-case';
import { GetCoinflipPlayerHistoryUseCase } from './application/get-coinflip-player-history.use-case';
import { GetCoinflipPlayerStatusUseCase } from './application/get-coinflip-player-status.use-case';
import { LimitCoinflipPlayerUseCase } from './application/limit-coinflip-player.use-case';
import { ListCoinflipPlayersUseCase } from './application/list-coinflip-players.use-case';
import { CoinflipPlayerModerationRedisSync } from './infrastructure/coinflip-player-moderation-redis.sync';
import { PrismaCoinflipPlayersRepository } from './infrastructure/prisma-coinflip-players.repository';
import { CoinflipPlayersController } from './presentation/coinflip-players.controller';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, CoinflipBannedUserIdsModule],
  controllers: [CoinflipPlayersController],
  providers: [
    PrismaCoinflipPlayersRepository,
    CoinflipPlayerModerationRedisSync,
    ListCoinflipPlayersUseCase,
    GetCoinflipPlayerHistoryUseCase,
    GetCoinflipPlayerStatusUseCase,
    BanCoinflipPlayerUseCase,
    LimitCoinflipPlayerUseCase,
    ClearCoinflipPlayerModerationUseCase,
  ],
})
export class CoinflipPlayersModule {}
