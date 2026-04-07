import { Inject, Injectable } from '@nestjs/common';
import {
  formatUtcHourLabel,
  last24HourChartContext,
  utcTruncateToHour,
} from '../../common/rolling-analytics-window';
import type { ICrashAnalyticsRepository } from '../domain/crash-analytics.repository';
import { CRASH_ANALYTICS_REPOSITORY } from '../infrastructure/crash-analytics.tokens';
import { CrashPlayerActivityChartPointDto } from '../presentation/dto/crash-control-room.response.dto';

@Injectable()
export class GetCrashPlayerActivityChartUseCase {
  constructor(
    @Inject(CRASH_ANALYTICS_REPOSITORY)
    private readonly repo: ICrashAnalyticsRepository,
  ) {}

  async execute(): Promise<CrashPlayerActivityChartPointDto[]> {
    const now = new Date();
    const ctx = last24HourChartContext(now);
    const rows = await this.repo.aggregateActivePlayersByUtcHour(
      ctx.queryFromInclusive,
      ctx.queryToInclusive,
    );
    const byTime = new Map(
      rows.map(
        (r) =>
          [formatUtcHourLabel(utcTruncateToHour(r.bucketUtc)), r] as const,
      ),
    );
    return ctx.bucketStartsUtc.map((bucket) => {
      const label = formatUtcHourLabel(bucket);
      const r = byTime.get(label);
      const p = new CrashPlayerActivityChartPointDto();
      p.time = label;
      p.activePlayers = r?.activePlayers ?? 0;
      return p;
    });
  }
}
