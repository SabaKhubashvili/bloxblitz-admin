export type MinesOverviewChartPointDto = { x: string; y: number };

export type MinesOverviewResponseDto = {
  stats: {
    totalGamesPlayed: number;
    totalWagered: number;
    totalProfitLoss: number;
    activePlayers: number;
    avgCashoutMultiplier: number;
  };
  charts: {
    gamesPlayed: MinesOverviewChartPointDto[];
    profitLoss: MinesOverviewChartPointDto[];
    avgMultiplier: MinesOverviewChartPointDto[];
  };
};
