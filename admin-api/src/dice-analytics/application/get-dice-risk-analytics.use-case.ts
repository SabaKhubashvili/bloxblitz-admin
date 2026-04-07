import { Inject, Injectable } from '@nestjs/common';
import {
  rollingWindowBounds,
  type RollingAnalyticsPreset,
} from '../../common/rolling-analytics-window';
import type {
  DiceRiskPostureRow,
  IDiceAnalyticsRepository,
} from '../domain/dice-analytics.repository.port';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';

@Injectable()
export class GetDiceRiskAnalyticsUseCase {
  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
  ) {}

  async execute(range: RollingAnalyticsPreset): Promise<DiceRiskPostureRow> {
    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    return this.repo.aggregateRiskPosture(from, to);
  }
}
