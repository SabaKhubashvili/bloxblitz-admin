export type TowersOverviewChartPointDto = { x: string; y: number };

export type TowersOverviewResponseDto = {
  stats: {
    totalGamesPlayed: number;
    totalWagered: number;
    totalProfitLoss: number;
    activePlayers: number;
    avgCashoutMultiplier: number;
  };
  charts: {
    gamesPlayed: TowersOverviewChartPointDto[];
    profitLoss: TowersOverviewChartPointDto[];
    avgMultiplier: TowersOverviewChartPointDto[];
  };
  chartNote?: string;
};
