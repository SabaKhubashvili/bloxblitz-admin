import { Inject, Injectable } from '@nestjs/common';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import type { ICasesChartsRepository } from '../domain/cases-charts.repository';
import { CASES_CHARTS_REPOSITORY } from '../infrastructure/cases-charts.tokens';
import { buildCasesChartBucketPlan } from './cases-chart-buckets';
import {
  CasesPopularResponseDto,
  PopularCaseDto,
} from '../presentation/dto/cases-popular.response.dto';

const TOP_LIMIT = 5;

@Injectable()
export class GetCasesPopularUseCase {
  constructor(
    @Inject(CASES_CHARTS_REPOSITORY)
    private readonly repo: ICasesChartsRepository,
  ) {}

  async execute(range: RollingAnalyticsPreset): Promise<CasesPopularResponseDto> {
    const now = new Date();
    const plan = buildCasesChartBucketPlan(range, now);
    const rows = await this.repo.findMostPopularCasesByOpens(
      plan.queryFromInclusive,
      plan.queryToExclusive,
      TOP_LIMIT,
    );
    const dto = new CasesPopularResponseDto();
    dto.range = range;
    dto.cases = rows.map((r) => {
      const c = new PopularCaseDto();
      c.id = r.caseId;
      c.name = r.name;
      c.price = r.price;
      c.opens = r.opens;
      return c;
    });
    return dto;
  }
}
