export type DicePlayerStatusApi = 'active' | 'limited' | 'banned';

export type DicePlayerStatsDto = {
  username: string;
  rolls: number;
  wagered: number;
  /** Win rate % with one decimal (e.g. 48.1). */
  winRate: number;
  profitLoss: number;
  risk: 'low' | 'medium' | 'high';
  status: DicePlayerStatusApi;
  /** Admin moderation cap per roll; only set when `status === "limited"`. */
  maxBet: number | null;
};

export type DicePlayersResponseDto = {
  players: DicePlayerStatsDto[];
  total: number;
  page: number;
  limit: number;
};
