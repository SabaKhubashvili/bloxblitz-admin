import { Inject, Injectable } from '@nestjs/common';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { rollingWindowBounds } from '../../common/rolling-analytics-window';
import type { ICrashAnalyticsRepository } from '../domain/crash-analytics.repository';
import { CRASH_ANALYTICS_REPOSITORY } from '../infrastructure/crash-analytics.tokens';
import { CrashStatisticsOverviewResponseDto } from '../presentation/dto/crash-control-room.response.dto';

@Injectable()
export class GetCrashStatisticsOverviewUseCase {
  constructor(
    @Inject(CRASH_ANALYTICS_REPOSITORY)
    private readonly repo: ICrashAnalyticsRepository,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
  ): Promise<CrashStatisticsOverviewResponseDto> {

    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const row = await this.repo.aggregateOverview(from, to);
    const dto = CrashStatisticsOverviewResponseDto.fromAggregate(range, row);
    return dto;
  }
}
