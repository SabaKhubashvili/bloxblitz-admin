/** Mirrors BloxBlitz_Amp mines/towers system JSON shape. */
export enum TowersSystemMode {
  ACTIVE = 'ACTIVE',
  NEW_GAMES_DISABLED = 'NEW_GAMES_DISABLED',
  PAUSED = 'PAUSED',
}

/** Shared with BloxBlitz_Amp `RedisKeys.towers.systemState`. */
export const TOWERS_SYSTEM_STATE_REDIS_KEY = 'towers:system:state';

export type TowersSystemStatePayload = {
  mode: TowersSystemMode;
};

export function parseTowersSystemState(
  raw: unknown,
): TowersSystemStatePayload | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const mode = (raw as Record<string, unknown>).mode;
  if (
    mode === TowersSystemMode.ACTIVE ||
    mode === TowersSystemMode.NEW_GAMES_DISABLED ||
    mode === TowersSystemMode.PAUSED
  ) {
    return { mode };
  }
  return null;
}
