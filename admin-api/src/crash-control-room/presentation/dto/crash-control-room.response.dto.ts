import type { RollingAnalyticsPreset } from '../../../common/rolling-analytics-window';

export class CrashStatisticsOverviewResponseDto {
  range: RollingAnalyticsPreset;
  totalWagered: number;
  totalPayout: number;
  profitLoss: number;
  activePlayers: number;
  totalBets: number;

  static fromAggregate(
    range: RollingAnalyticsPreset,
    row: {
      totalWagered: number;
      totalPayout: number;
      profitLoss: number;
      activePlayers: number;
      totalBets: number;
    },
  ): CrashStatisticsOverviewResponseDto {
    const o = new CrashStatisticsOverviewResponseDto();
    o.range = range;
    o.totalWagered = row.totalWagered;
    o.totalPayout = row.totalPayout;
    o.profitLoss = row.profitLoss;
    o.activePlayers = row.activePlayers;
    o.totalBets = row.totalBets;
    return o;
  }
}

export class CrashMultiplierHistoryEntryDto {
  roundId: string;
  crashMultiplier: number;
  createdAt: string;

  static fromRow(row: {
    roundId: string;
    crashMultiplier: number;
    createdAt: Date;
  }): CrashMultiplierHistoryEntryDto {
    const o = new CrashMultiplierHistoryEntryDto();
    o.roundId = row.roundId;
    o.crashMultiplier = row.crashMultiplier;
    o.createdAt = row.createdAt.toISOString();
    return o;
  }
}

export class CrashProfitLossChartPointDto {
  time: string;
  profit: number;
  loss: number;
}

export class CrashPlayerActivityChartPointDto {
  time: string;
  activePlayers: number;
}

/** Redis-backed global Crash runtime flags (see CrashRuntimeRedisService). */
export class CrashRuntimeStateResponseDto {
  paused: boolean;
  betsDisabled: boolean;
}
