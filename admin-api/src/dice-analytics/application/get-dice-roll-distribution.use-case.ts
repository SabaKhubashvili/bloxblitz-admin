import { Inject, Injectable } from '@nestjs/common';
import { rollingWindowBounds } from '../../common/rolling-analytics-window';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import type { IDiceAnalyticsRepository } from '../domain/dice-analytics.repository.port';
import type { DiceRollDistributionPointDto } from '../presentation/dto/dice-analytics.response.dto';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';

@Injectable()
export class GetDiceRollDistributionUseCase {
  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
  ): Promise<DiceRollDistributionPointDto[]> {
    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    return this.repo.aggregateRollDistribution(from, to);
  }
}
