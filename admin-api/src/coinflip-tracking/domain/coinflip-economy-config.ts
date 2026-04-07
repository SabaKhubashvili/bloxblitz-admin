export interface CoinflipEconomyConfig {
  minBet: number;
  maxBet: number;
  platformFee: number;
  maxActiveGames: number;
  maxGamesPerUser: number;
}

export const COINFLIP_ECONOMY_CONFIG_DEFAULTS: CoinflipEconomyConfig = {
  minBet: 0.1,
  maxBet: 3000,
  platformFee: 1,
  maxActiveGames: 140,
  maxGamesPerUser: 5,
};
