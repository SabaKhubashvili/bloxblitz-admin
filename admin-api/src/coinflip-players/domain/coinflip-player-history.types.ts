export type CoinflipPlayerHistoryRow = {
  gameId: string;
  opponentUsername: string;
  wagerAmount: string;
  result: 'win' | 'loss';
  profitLoss: string;
  createdAt: string;
};

export type CoinflipPlayerHistoryPage = {
  items: CoinflipPlayerHistoryRow[];
  total: number;
};
