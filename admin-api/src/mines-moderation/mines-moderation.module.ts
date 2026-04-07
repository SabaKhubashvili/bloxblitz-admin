import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ClearMinesModerationUseCase } from './application/clear-mines-moderation.use-case';
import { ListMinesModerationUseCase } from './application/list-mines-moderation.use-case';
import { UnbanMinesPlayerUseCase } from './application/unban-mines-player.use-case';
import { UnlimitMinesPlayerUseCase } from './application/unlimit-mines-player.use-case';
import { UpsertMinesModerationUseCase } from './application/upsert-mines-moderation.use-case';
import { MinesPlayerControlRedisService } from './infrastructure/mines-player-control.redis.service';
import { MinesPlayerControlBootstrapService } from './mines-player-control.bootstrap.service';
import { MinesModerationController } from './presentation/mines-moderation.controller';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [MinesModerationController],
  providers: [
    MinesPlayerControlRedisService,
    MinesPlayerControlBootstrapService,
    ListMinesModerationUseCase,
    UpsertMinesModerationUseCase,
    ClearMinesModerationUseCase,
    UnbanMinesPlayerUseCase,
    UnlimitMinesPlayerUseCase,
  ],
  exports: [MinesPlayerControlRedisService],
})
export class MinesModerationModule {}
