export type RouletteRestrictionResponseDto = {
  username: string;
  restriction: {
    isBanned: boolean;
    banReason: string | null;
    maxWagerAmount: number | null;
    timeframe: 'HOURLY' | 'DAILY' | 'WEEKLY' | null;
  } | null;
};
