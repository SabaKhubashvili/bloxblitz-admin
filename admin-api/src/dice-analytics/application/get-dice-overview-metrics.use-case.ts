import { Inject, Injectable } from '@nestjs/common';
import { rollingWindowBounds } from '../../common/rolling-analytics-window';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import type { IDiceAnalyticsRepository } from '../domain/dice-analytics.repository.port';
import type { DiceAnalyticsMetricsDto } from '../presentation/dto/dice-analytics.response.dto';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';

@Injectable()
export class GetDiceOverviewMetricsUseCase {
  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
  ): Promise<DiceAnalyticsMetricsDto> {
    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const row = await this.repo.aggregateOverview(from, to);
    return {
      totalRolls: row.totalRolls,
      totalWagered: row.totalWagered,
      profit: row.profit,
      activePlayers: row.activePlayers,
    };
  }
}
