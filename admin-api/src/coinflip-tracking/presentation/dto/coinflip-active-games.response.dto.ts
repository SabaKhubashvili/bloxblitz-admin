export type CoinflipActiveGamePlayerDto = {
  username: string;
  wager: number;
  /** Heads/tails from `H` / `T`. */
  side: 'H' | 'T';
  profilePicture?: string;
  level?: number;
  id?: string;
};

export type CoinflipActiveGameFairnessDto = {
  serverSeedHash: string;
  nonce: string;
  serverSeed?: string;
  eosBlockNum?: number;
  eosBlockId?: string;
};

export type CoinflipActiveGameDto = {
  id: string;
  player1: CoinflipActiveGamePlayerDto;
  player2: CoinflipActiveGamePlayerDto | null;
  totalWager: number;
  state: 'waiting' | 'playing';
  createdAt: string;
  fairness?: CoinflipActiveGameFairnessDto;
};

export type CoinflipActiveGamesResponseDto = {
  games: CoinflipActiveGameDto[];
};
