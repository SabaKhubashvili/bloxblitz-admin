import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  buildOpenRateBucketKeys,
  bucketKeyForOpenRate,
  openRateSqlGranularity,
} from '../../common/case-analytics-buckets';
import type { RollingAnalyticsPreset } from '../../common/rolling-analytics-window';
import { rollingWindowBounds } from '../../common/rolling-analytics-window';
import type { ICaseAnalyticsRepository } from '../domain/case-analytics.repository';
import { CASE_ANALYTICS_REPOSITORY } from '../infrastructure/case-analytics.tokens';
import type { CaseAnalyticsResponseDto } from '../presentation/dto/case-analytics.response.dto';

@Injectable()
export class GetCaseAnalyticsUseCase {
  constructor(
    @Inject(CASE_ANALYTICS_REPOSITORY)
    private readonly repo: ICaseAnalyticsRepository,
  ) {}

  async execute(args: {
    caseId: string;
    range: RollingAnalyticsPreset;
    mostWonLimit: number;
  }): Promise<CaseAnalyticsResponseDto> {
    const { caseId, range, mostWonLimit } = args;
    const exists = await this.repo.assertCaseExists(caseId);
    if (!exists) {
      throw new NotFoundException(`Case not found: ${caseId}`);
    }

    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const gran = openRateSqlGranularity(range);

    const [overview, mostWonItems, openRateRows, distributionRows] =
      await Promise.all([
        this.repo.aggregateOverview(caseId, from, to),
        this.repo.findMostWonItems(caseId, from, to, mostWonLimit),
        this.repo.aggregateOpenRate(caseId, from, to, gran),
        this.repo.aggregateDropDistribution(caseId, from, to),
      ]);

    const openByKey = new Map<string, number>();
    for (const row of openRateRows) {
      openByKey.set(
        bucketKeyForOpenRate(range, row.bucketUtc),
        row.openCount,
      );
    }
    const bucketKeys = buildOpenRateBucketKeys(range, from, to);
    const openRateOverTime = bucketKeys.map((date) => ({
      date,
      openCount: openByKey.get(date) ?? 0,
    }));

    const totalDrops = distributionRows.reduce((s, r) => s + r.dropCount, 0);
    const itemDropDistribution =
      totalDrops === 0
        ? []
        : distributionRows.map((r) => ({
            itemName: r.itemName,
            dropCount: r.dropCount,
            percentage:
              Math.round((r.dropCount / totalDrops) * 10_000) / 100,
          }));

    return {
      range,
      caseId,
      overview: {
        totalOpened: overview.totalOpened,
        revenue: overview.revenue,
        avgRtp: overview.avgRtp,
      },
      mostWonItems,
      openRateOverTime,
      itemDropDistribution,
    };
  }
}
