/** Domain timeframe — mirrors `RestrictionTimeframe` in Prisma without importing Prisma. */
export type RestrictionTimeframe = 'HOURLY' | 'DAILY' | 'WEEKLY';

export function timeframeTtlSeconds(tf: RestrictionTimeframe): number {
  switch (tf) {
    case 'HOURLY':
      return 3600;
    case 'DAILY':
      return 86_400;
    case 'WEEKLY':
      return 604_800;
  }
}
