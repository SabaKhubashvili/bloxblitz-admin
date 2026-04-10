import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CoinflipBotsAdminService } from './application/coinflip-bots-admin.service';
import { CoinflipBotsRedisBootstrapService } from './infrastructure/coinflip-bots-redis-bootstrap.service';
import { CoinflipBotsController } from './presentation/coinflip-bots.controller';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  controllers: [CoinflipBotsController],
  providers: [CoinflipBotsAdminService, CoinflipBotsRedisBootstrapService],
  exports: [CoinflipBotsAdminService],
})
export class CoinflipBotsModule {}
