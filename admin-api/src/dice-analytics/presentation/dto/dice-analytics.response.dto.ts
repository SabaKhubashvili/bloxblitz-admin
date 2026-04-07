export type DiceAnalyticsMetricsDto = {
  totalRolls: number;
  totalWagered: number;
  profit: number;
  activePlayers: number;
};

export type DiceRollDistributionPointDto = {
  value: number;
  count: number;
};

export type DiceProfitTimePointDto = {
  timestamp: string;
  profit: number;
  loss: number;
};

export type DiceBetDistributionPointDto = {
  range: string;
  count: number;
};

export type DiceAnalyticsChartsDto = {
  rollDistribution: DiceRollDistributionPointDto[];
  profitOverTime: DiceProfitTimePointDto[];
  betDistribution: DiceBetDistributionPointDto[];
};

export type DiceAnalyticsResponseDto = {
  range: '24h' | '7d' | '30d';
  metrics: DiceAnalyticsMetricsDto;
  charts: DiceAnalyticsChartsDto;
};
