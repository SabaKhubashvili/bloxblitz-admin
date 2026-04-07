import { Inject, Injectable } from '@nestjs/common';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { rollingWindowBounds } from '../../common/rolling-analytics-window';
import type { ICasesOverviewRepository } from '../domain/cases-overview.repository';
import { CASES_OVERVIEW_REPOSITORY } from '../infrastructure/cases-overview.tokens';
import { CasesOverviewResponseDto } from '../presentation/dto/cases-overview.response.dto';

@Injectable()
export class GetCasesOverviewUseCase {
  constructor(
    @Inject(CASES_OVERVIEW_REPOSITORY)
    private readonly repo: ICasesOverviewRepository,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
  ): Promise<CasesOverviewResponseDto> {
    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const row = await this.repo.aggregateOverview(from, to);
    return CasesOverviewResponseDto.fromAggregate(range, row);
  }
}
