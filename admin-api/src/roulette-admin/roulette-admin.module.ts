import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { GetRouletteAnalyticsUseCase } from './application/get-roulette-analytics.use-case';
import { GetRecentRouletteBetsUseCase } from './application/get-recent-roulette-bets.use-case';
import { GetRoulettePlayersUseCase } from './application/get-roulette-players.use-case';
import { GetRouletteConfigUseCase } from './application/get-roulette-config.use-case';
import { UpdateRouletteConfigUseCase } from './application/update-roulette-config.use-case';
import { GetRouletteOperatorStateUseCase } from './application/get-roulette-operator-state.use-case';
import { PrismaRouletteAnalyticsRepository } from './infrastructure/prisma-roulette-analytics.repository';
import { RouletteConfigRedisRepository } from './infrastructure/roulette-config.redis.repository';
import { RouletteAdminController } from './presentation/roulette-admin.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RouletteAdminController],
  providers: [
    PrismaRouletteAnalyticsRepository,
    RouletteConfigRedisRepository,
    GetRouletteAnalyticsUseCase,
    GetRecentRouletteBetsUseCase,
    GetRoulettePlayersUseCase,
    GetRouletteConfigUseCase,
    UpdateRouletteConfigUseCase,
    GetRouletteOperatorStateUseCase,
  ],
})
export class RouletteAdminModule {}
