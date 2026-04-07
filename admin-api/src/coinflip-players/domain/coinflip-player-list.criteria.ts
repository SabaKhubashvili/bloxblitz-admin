import type { CoinflipPlayersModerationFilter } from './coinflip-player-public-status';

export type CoinflipPlayersSortField =
  | 'totalWagered'
  | 'profitLoss'
  | 'winRate'
  | 'totalGames'
  | 'username';

export type CoinflipPlayersListCriteria = {
  page: number;
  limit: number;
  sort: CoinflipPlayersSortField;
  order: 'asc' | 'desc';
  /** Exact match on `User.id` (uuid). */
  userId?: string | null;
  /** Case-insensitive substring on username. Ignored when `userId` is set. */
  searchUsername?: string | null;
  status?: CoinflipPlayersModerationFilter;
};
