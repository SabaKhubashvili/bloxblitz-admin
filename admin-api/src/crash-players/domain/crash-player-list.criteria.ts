import type { CrashPlayersModerationFilter } from './crash-player-public-status';

export type CrashPlayersTimePreset = '24h' | '7d' | '30d' | 'custom';

export type CrashPlayersSortField =
  | 'username'
  | 'totalWagered'
  | 'profitLoss'
  | 'totalBets';

export type CrashPlayersListCriteria = {
  from: Date;
  to: Date;
  search?: string;
  status?: CrashPlayersModerationFilter;
  page: number;
  limit: number;
  sort: CrashPlayersSortField;
  order: 'asc' | 'desc';
};
