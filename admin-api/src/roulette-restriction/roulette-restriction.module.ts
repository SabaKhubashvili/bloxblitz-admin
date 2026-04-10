import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ROULETTE_RESTRICTION_CACHE } from './application/ports/roulette-restriction.cache.port';
import { ROULETTE_RESTRICTION_REPOSITORY } from './application/ports/roulette-restriction.repository.port';
import { PrismaRouletteRestrictionRepository } from './infrastructure/prisma-roulette-restriction.repository';
import { RouletteRestrictionRedisCache } from './infrastructure/roulette-restriction.redis-cache';
import { SetPlayerRestrictionUseCase } from './application/set-player-restriction.use-case';
import { BanPlayerUseCase } from './application/ban-player.use-case';
import { UnbanPlayerUseCase } from './application/unban-player.use-case';
import { GetPlayerRestrictionUseCase } from './application/get-player-restriction.use-case';
import { DeletePlayerRestrictionUseCase } from './application/delete-player-restriction.use-case';
import { RouletteRestrictionBootstrapService } from './application/roulette-restriction-bootstrap.service';
import { RouletteRestrictionController } from './presentation/roulette-restriction.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RouletteRestrictionController],
  providers: [
    {
      provide: ROULETTE_RESTRICTION_REPOSITORY,
      useClass: PrismaRouletteRestrictionRepository,
    },
    {
      provide: ROULETTE_RESTRICTION_CACHE,
      useClass: RouletteRestrictionRedisCache,
    },
    SetPlayerRestrictionUseCase,
    BanPlayerUseCase,
    UnbanPlayerUseCase,
    GetPlayerRestrictionUseCase,
    DeletePlayerRestrictionUseCase,
    RouletteRestrictionBootstrapService,
  ],
})
export class RouletteRestrictionModule {}
