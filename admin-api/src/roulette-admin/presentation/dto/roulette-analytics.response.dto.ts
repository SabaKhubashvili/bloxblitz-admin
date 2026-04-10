export type RouletteAnalyticsMetricsDto = {
  totalGames: number;
  totalWagered: number;
  profit: number;
  activePlayers: number;
};

export type RouletteGamesTimePointDto = {
  timestamp: string;
  count: number;
};

export type RouletteProfitTimePointDto = {
  timestamp: string;
  profit: number;
  loss: number;
};

export type RouletteOutcomePointDto = {
  outcome: string;
  count: number;
};

export type RouletteAnalyticsResponseDto = {
  range: '24h' | '7d' | '30d';
  metrics: RouletteAnalyticsMetricsDto;
  charts: {
    gamesPlayedOverTime: RouletteGamesTimePointDto[];
    profitOverTime: RouletteProfitTimePointDto[];
    outcomeDistribution: RouletteOutcomePointDto[];
  };
};
