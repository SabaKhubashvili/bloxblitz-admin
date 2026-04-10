import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { TOWERS_RESTRICTION_CACHE } from './application/ports/towers-restriction.cache.port';
import { TOWERS_RESTRICTION_REPOSITORY } from './application/ports/towers-restriction.repository.port';
import { PrismaTowersRestrictionRepository } from './infrastructure/prisma-towers-restriction.repository';
import { TowersRestrictionRedisCache } from './infrastructure/towers-restriction.redis-cache';
import { SetTowersRestrictionUseCase } from './application/set-towers-restriction.use-case';
import { BanTowersPlayerUseCase } from './application/ban-towers-player.use-case';
import { UnbanTowersPlayerUseCase } from './application/unban-towers-player.use-case';
import { GetTowersRestrictionUseCase } from './application/get-towers-restriction.use-case';
import { DeleteTowersRestrictionUseCase } from './application/delete-towers-restriction.use-case';
import { TowersRestrictionBootstrapService } from './application/towers-restriction-bootstrap.service';
import { TowersRestrictionController } from './presentation/towers-restriction.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [TowersRestrictionController],
  providers: [
    {
      provide: TOWERS_RESTRICTION_REPOSITORY,
      useClass: PrismaTowersRestrictionRepository,
    },
    {
      provide: TOWERS_RESTRICTION_CACHE,
      useClass: TowersRestrictionRedisCache,
    },
    SetTowersRestrictionUseCase,
    BanTowersPlayerUseCase,
    UnbanTowersPlayerUseCase,
    GetTowersRestrictionUseCase,
    DeleteTowersRestrictionUseCase,
    TowersRestrictionBootstrapService,
  ],
})
export class TowersRestrictionModule {}
