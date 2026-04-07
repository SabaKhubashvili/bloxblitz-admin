export type CoinflipHistoryPlayerDto = {
  username: string;
  side: 'H' | 'T';
  wager: number;
};

export type CoinflipHistoryGameDto = {
  id: string;
  player1: CoinflipHistoryPlayerDto | null;
  player2: CoinflipHistoryPlayerDto | null;
  totalWager: number;
  state: 'waiting' | 'playing' | 'finished';
  winner?: string;
  createdAt: string;
};

export type CoinflipHistoryResponseDto = {
  games: CoinflipHistoryGameDto[];
};
