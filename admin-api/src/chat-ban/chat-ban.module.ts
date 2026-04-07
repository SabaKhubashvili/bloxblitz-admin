import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ChatBanService } from './chat-ban.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [ChatBanService],
  exports: [ChatBanService],
})
export class ChatBanModule {}
