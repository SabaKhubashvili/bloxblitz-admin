export type CoinflipChartPointDto = { x: string; y: number };

export class CoinflipOverviewStatsBlockDto {
  totalGames!: number;
  totalWagered!: number;
  platformProfit!: number;
  activeGamesCount!: number;
}

export class CoinflipOverviewChartsBlockDto {
  gamesCreated!: CoinflipChartPointDto[];
  wagerVolume!: CoinflipChartPointDto[];
  playerActivity!: CoinflipChartPointDto[];
}

export class CoinflipOverviewResponseDto {
  stats!: CoinflipOverviewStatsBlockDto;
  charts!: CoinflipOverviewChartsBlockDto;
}
