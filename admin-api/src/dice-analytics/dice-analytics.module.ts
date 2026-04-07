import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { PrismaDiceAnalyticsRepository } from './infrastructure/prisma-dice-analytics.repository';
import { DICE_ANALYTICS_REPOSITORY } from './infrastructure/dice-analytics.tokens';
import { GetDiceOverviewMetricsUseCase } from './application/get-dice-overview-metrics.use-case';
import { GetDiceRollDistributionUseCase } from './application/get-dice-roll-distribution.use-case';
import { GetDiceProfitTimeSeriesUseCase } from './application/get-dice-profit-time-series.use-case';
import { GetDiceBetDistributionUseCase } from './application/get-dice-bet-distribution.use-case';
import { GetDiceAnalyticsUseCase } from './application/get-dice-analytics.use-case';
import { GetDiceConfigUseCase } from './application/get-dice-config.use-case';
import { GetRecentDiceGamesUseCase } from './application/get-recent-dice-games.use-case';
import { UpdateDiceConfigUseCase } from './application/update-dice-config.use-case';
import { DiceConfigRedisRepository } from './infrastructure/dice-config.redis.repository';
import { DICE_CONFIG_REPOSITORY } from './infrastructure/dice-config.tokens';
import { DiceAnalyticsController } from './presentation/dice-analytics.controller';
import { DiceAnalyticsDetailController } from './presentation/dice-analytics-detail.controller';
import { GetDiceHeatmapAnalyticsUseCase } from './application/get-dice-heatmap-analytics.use-case';
import { GetDiceTargetRangesAnalyticsUseCase } from './application/get-dice-target-ranges-analytics.use-case';
import { GetDiceScatterAnalyticsUseCase } from './application/get-dice-scatter-analytics.use-case';
import { GetDiceRiskAnalyticsUseCase } from './application/get-dice-risk-analytics.use-case';
import { GetDicePlayersUseCase } from './application/get-dice-players.use-case';
import { GetDicePlayerDetailUseCase } from './application/get-dice-player-detail.use-case';
import { BanDicePlayerUseCase } from './application/ban-dice-player.use-case';
import { UnbanDicePlayerUseCase } from './application/unban-dice-player.use-case';
import { LimitDicePlayerUseCase } from './application/limit-dice-player.use-case';
import { UnlimitDicePlayerUseCase } from './application/unlimit-dice-player.use-case';
import { DicePlayerControlRedisService } from './infrastructure/dice-player-control.redis.service';
import { DicePlayerControlBootstrapService } from './dice-player-control.bootstrap.service';
import { DiceBettingControlRedisService } from './infrastructure/dice-betting-control.redis.service';
import { GetDiceBettingStatusUseCase } from './application/get-dice-betting-status.use-case';
import { DisableDiceBettingUseCase } from './application/disable-dice-betting.use-case';
import { EnableDiceBettingUseCase } from './application/enable-dice-betting.use-case';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  controllers: [DiceAnalyticsController, DiceAnalyticsDetailController],
  providers: [
    DiceConfigRedisRepository,
    {
      provide: DICE_CONFIG_REPOSITORY,
      useExisting: DiceConfigRedisRepository,
    },
    PrismaDiceAnalyticsRepository,
    {
      provide: DICE_ANALYTICS_REPOSITORY,
      useExisting: PrismaDiceAnalyticsRepository,
    },
    GetDiceOverviewMetricsUseCase,
    GetDiceRollDistributionUseCase,
    GetDiceProfitTimeSeriesUseCase,
    GetDiceBetDistributionUseCase,
    GetDiceAnalyticsUseCase,
    GetRecentDiceGamesUseCase,
    GetDiceConfigUseCase,
    UpdateDiceConfigUseCase,
    GetDiceHeatmapAnalyticsUseCase,
    GetDiceTargetRangesAnalyticsUseCase,
    GetDiceScatterAnalyticsUseCase,
    GetDiceRiskAnalyticsUseCase,
    GetDicePlayersUseCase,
    GetDicePlayerDetailUseCase,
    DicePlayerControlRedisService,
    DicePlayerControlBootstrapService,
    BanDicePlayerUseCase,
    UnbanDicePlayerUseCase,
    LimitDicePlayerUseCase,
    UnlimitDicePlayerUseCase,
    DiceBettingControlRedisService,
    GetDiceBettingStatusUseCase,
    DisableDiceBettingUseCase,
    EnableDiceBettingUseCase,
  ],
})
export class DiceAnalyticsModule {}
