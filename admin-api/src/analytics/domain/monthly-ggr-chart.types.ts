import type { DiceRollMode, GameType } from '@prisma/client';

export interface MonthlyGgrChartBucket {
  /** `YYYY-MM`, chronological within the series. */
  month: string;
  totalWagered: string;
  totalPaidOut: string;
  /** GGR — same as `houseProfit`; kept explicit for dashboards. */
  houseProfit: string;
  ggr: string;
  betCount: number;
  /** Average house profit per settled bet (= average pooled net user loss to the platform per bet). */
  netUserLossPerBet: string;
}

export interface MonthlyGgrChartMeta {
  from: string;
  to: string;
  /** IANA timezone used only for month bucket boundaries in aggregation. */
  timeZone: string;
  monthsRequested: number;
  appliedFilters: {
    gameType?: GameType;
    diceRollMode?: DiceRollMode;
  };
}

export interface MonthlyGgrChartResult {
  series: MonthlyGgrChartBucket[];
  meta: MonthlyGgrChartMeta;
}
