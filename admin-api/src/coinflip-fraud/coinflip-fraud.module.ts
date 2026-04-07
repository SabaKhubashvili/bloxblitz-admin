import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { CoinflipBannedUserIdsModule } from '../coinflip-banned-user-ids/coinflip-banned-user-ids.module';
import { CoinflipFraudRedisRepository } from './infrastructure/coinflip-fraud.redis-repository';
import { CoinflipFraudStreamConsumer } from './infrastructure/coinflip-fraud-stream.consumer';
import { CoinflipFraudScheduledWorker } from './infrastructure/coinflip-fraud-scheduled.worker';
import { CoinflipFraudScoringService } from './application/coinflip-fraud-scoring.service';
import { CoinflipFraudPayoutProcessor } from './application/coinflip-fraud-payout-processor.service';
import { ProcessCoinflipFraudEventUseCase } from './application/process-coinflip-fraud-event.use-case';
import { CoinflipFraudGraphAnalysisService } from './application/coinflip-fraud-graph-analysis.service';
import { GetCoinflipSuspiciousUsersUseCase } from './application/get-coinflip-suspicious-users.use-case';
import { GetCoinflipSuspiciousGamesUseCase } from './application/get-coinflip-suspicious-games.use-case';
import { GetCoinflipUserRiskProfileUseCase } from './application/get-coinflip-user-risk-profile.use-case';
import { CoinflipFraudAdminActionsUseCase } from './application/coinflip-fraud-admin-actions.use-case';
import { CoinflipFraudController } from './presentation/coinflip-fraud.controller';

@Module({
  imports: [RedisModule, AuthModule, CoinflipBannedUserIdsModule],
  controllers: [CoinflipFraudController],
  providers: [
    CoinflipFraudRedisRepository,
    CoinflipFraudScoringService,
    CoinflipFraudPayoutProcessor,
    ProcessCoinflipFraudEventUseCase,
    CoinflipFraudGraphAnalysisService,
    CoinflipFraudStreamConsumer,
    CoinflipFraudScheduledWorker,
    GetCoinflipSuspiciousUsersUseCase,
    GetCoinflipSuspiciousGamesUseCase,
    GetCoinflipUserRiskProfileUseCase,
    CoinflipFraudAdminActionsUseCase,
  ],
})
export class CoinflipFraudModule {}
