import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CoinflipBannedUserIdsRedisService } from './coinflip-banned-user-ids.redis.service';
import { CoinflipBannedUsersBootstrapService } from './coinflip-banned-users-bootstrap.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [CoinflipBannedUserIdsRedisService, CoinflipBannedUsersBootstrapService],
  exports: [CoinflipBannedUserIdsRedisService],
})
export class CoinflipBannedUserIdsModule {}
