import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  rollingWindowBounds,
  type RollingAnalyticsPreset,
} from '../../common/rolling-analytics-window';
import type {
  DiceScatterQueryOpts,
  DiceScatterSeries,
  IDiceAnalyticsRepository,
} from '../domain/dice-analytics.repository.port';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';

@Injectable()
export class GetDiceScatterAnalyticsUseCase {
  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
    opts?: DiceScatterQueryOpts,
  ): Promise<DiceScatterSeries> {
    const minB = opts?.minBet;
    const maxB = opts?.maxBet;
    if (
      minB != null &&
      maxB != null &&
      minB > 0 &&
      maxB > 0 &&
      minB > maxB
    ) {
      throw new BadRequestException(
        'minBet must be less than or equal to maxBet',
      );
    }

    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    return this.repo.aggregateWinRateScatter(from, to, opts);
  }
}
