import { Inject, Injectable } from '@nestjs/common';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import type { ICasesChartsRepository } from '../domain/cases-charts.repository';
import { CASES_CHARTS_REPOSITORY } from '../infrastructure/cases-charts.tokens';
import {
  buildCasesChartBucketPlan,
  mergeSeriesIntoBuckets,
} from './cases-chart-buckets';
import { CasesChartResponseDto } from '../presentation/dto/cases-charts.response.dto';

@Injectable()
export class GetCasesRevenueChartUseCase {
  constructor(
    @Inject(CASES_CHARTS_REPOSITORY)
    private readonly repo: ICasesChartsRepository,
  ) {}

  async execute(range: RollingAnalyticsPreset): Promise<CasesChartResponseDto> {
    const now = new Date();
    const plan = buildCasesChartBucketPlan(range, now);
    const rows = await this.repo.aggregateRevenueSeries(
      plan.queryFromInclusive,
      plan.queryToExclusive,
      plan.granularity,
    );
    const data = mergeSeriesIntoBuckets(plan, rows);
    return CasesChartResponseDto.fromSeries(
      range,
      plan.labels,
      'Revenue',
      data,
    );
  }
}
