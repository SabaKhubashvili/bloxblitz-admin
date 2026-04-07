import type { CrashPlayerPublicStatus } from './crash-player-public-status';

export type CrashPlayerListRow = {
  username: string;
  totalWagered: string;
  profitLoss: string;
  totalBets: number;
  status: CrashPlayerPublicStatus;
  limits: {
    maxBetAmount: string | null;
    minSecondsBetweenBets: number | null;
  } | null;
};

export type CrashPlayerListPage = {
  items: CrashPlayerListRow[];
  total: number;
};
