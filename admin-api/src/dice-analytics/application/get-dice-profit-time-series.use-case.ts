import { Inject, Injectable } from '@nestjs/common';
import {
  last24HourChartContext,
  MS_DAY,
  rollingWindowBounds,
  utcTruncateToDay,
  type RollingAnalyticsPreset,
} from '../../common/rolling-analytics-window';
import type { IDiceAnalyticsRepository } from '../domain/dice-analytics.repository.port';
import type { DiceProfitTimePointDto } from '../presentation/dto/dice-analytics.response.dto';
import { DICE_ANALYTICS_REPOSITORY } from '../infrastructure/dice-analytics.tokens';

@Injectable()
export class GetDiceProfitTimeSeriesUseCase {
  constructor(
    @Inject(DICE_ANALYTICS_REPOSITORY)
    private readonly repo: IDiceAnalyticsRepository,
  ) {}

  async execute(
    range: RollingAnalyticsPreset,
  ): Promise<DiceProfitTimePointDto[]> {
    const now = new Date();
    const { from, to } = rollingWindowBounds(range, now);
    const gran: 'hour' | 'day' = range === '24h' ? 'hour' : 'day';
    const rows = await this.repo.aggregateProfitByBucket(from, to, gran);
    const byMs = new Map(rows.map((r) => [r.bucket.getTime(), r.net]));

    if (range === '24h') {
      const { bucketStartsUtc } = last24HourChartContext(now);
      return bucketStartsUtc.map((bucket) => {
        const net = byMs.get(bucket.getTime()) ?? 0;
        return splitNetToProfitLoss(net, bucket);
      });
    }

    const days = enumerateUtcDaysFromRange(from, to);
    return days.map((bucket) => {
      const net = byMs.get(bucket.getTime()) ?? 0;
      return splitNetToProfitLoss(net, bucket);
    });
  }
}

function splitNetToProfitLoss(
  net: number,
  bucket: Date,
): DiceProfitTimePointDto {
  return {
    timestamp: bucket.toISOString(),
    profit: net > 0 ? net : 0,
    loss: net < 0 ? -net : 0,
  };
}

function enumerateUtcDaysFromRange(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let d = utcTruncateToDay(from);
  const end = utcTruncateToDay(to);
  while (d.getTime() <= end.getTime()) {
    out.push(new Date(d));
    d = new Date(d.getTime() + MS_DAY);
  }
  return out;
}
