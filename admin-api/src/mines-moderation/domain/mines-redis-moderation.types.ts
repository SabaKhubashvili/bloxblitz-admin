/** Table/API status — derived from Redis `mines:control:{username}` (empty key = ACTIVE). */
export type MinesTableModerationStatus = 'ACTIVE' | 'BANNED' | 'LIMITED';

export type MinesRedisControlFields = {
  status: 'BANNED' | 'LIMITED';
  maxBetAmount: number | null;
  maxGamesPerHour: number | null;
};

export function parseRedisControlHash(
  h: Record<string, string> | null | undefined,
): MinesRedisControlFields | null {
  if (!h || Object.keys(h).length === 0) return null;
  const st = h.status;
  if (st !== 'BANNED' && st !== 'LIMITED') return null;

  let maxBetAmount: number | null = null;
  if (h.maxBetAmount != null && h.maxBetAmount !== '') {
    const n = Number(h.maxBetAmount);
    if (Number.isFinite(n)) maxBetAmount = n;
  }
  let maxGamesPerHour: number | null = null;
  if (h.maxGamesPerHour != null && h.maxGamesPerHour !== '') {
    const n = parseInt(h.maxGamesPerHour, 10);
    if (Number.isFinite(n)) maxGamesPerHour = n;
  }

  return {
    status: st,
    maxBetAmount,
    maxGamesPerHour,
  };
}

export function toTableStatus(
  fields: MinesRedisControlFields | null,
): MinesTableModerationStatus {
  if (!fields) return 'ACTIVE';
  return fields.status;
}
