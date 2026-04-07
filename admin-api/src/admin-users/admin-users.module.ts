import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CoinflipBannedUserIdsModule } from '../coinflip-banned-user-ids/coinflip-banned-user-ids.module';
import { CoinflipPlayerModerationRedisSync } from '../coinflip-players/infrastructure/coinflip-player-moderation-redis.sync';
import { CrashBetEligibilityCacheService } from '../crash-players/infrastructure/crash-bet-eligibility-cache.service';
import { DicePlayerControlRedisService } from '../dice-analytics/infrastructure/dice-player-control.redis.service';
import { MinesModerationModule } from '../mines-moderation/mines-moderation.module';
import { ChatBanModule } from '../chat-ban/chat-ban.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CountAdminUsersUseCase } from './application/count-admin-users.use-case';
import { GlobalUserModerationUseCase } from './application/global-user-moderation.use-case';
import { ListAdminUsersUseCase } from './application/list-admin-users.use-case';
import { UpdateAdminGameUserUseCase } from './application/update-admin-game-user.use-case';
import { AdminAuditLogService } from './infrastructure/admin-audit-log.service';
import { AdminGameUserCacheInvalidator } from './infrastructure/admin-game-user-cache.invalidator';
import { ADMIN_USER_READ_REPOSITORY } from './infrastructure/admin-user.tokens';
import { PrismaAdminUserReadRepository } from './infrastructure/prisma-admin-user.repository';
import { AdminUsersController } from './presentation/admin-users.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RedisModule,
    ChatBanModule,
    MinesModerationModule,
    CoinflipBannedUserIdsModule,
  ],
  controllers: [AdminUsersController],
  providers: [
    PrismaAdminUserReadRepository,
    {
      provide: ADMIN_USER_READ_REPOSITORY,
      useExisting: PrismaAdminUserReadRepository,
    },
    AdminAuditLogService,
    AdminGameUserCacheInvalidator,
    DicePlayerControlRedisService,
    CoinflipPlayerModerationRedisSync,
    CrashBetEligibilityCacheService,
    CountAdminUsersUseCase,
    ListAdminUsersUseCase,
    GlobalUserModerationUseCase,
    UpdateAdminGameUserUseCase,
  ],
})
export class AdminUsersModule {}
