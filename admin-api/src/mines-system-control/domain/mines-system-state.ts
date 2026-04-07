export enum MinesSystemMode {
  ACTIVE = 'ACTIVE',
  NEW_GAMES_DISABLED = 'NEW_GAMES_DISABLED',
  PAUSED = 'PAUSED',
}

/** Shared with BloxBlitz_Amp `RedisKeys.mines.systemState`. */
export const MINES_SYSTEM_STATE_REDIS_KEY = 'mines:system:state';

export type MinesSystemStatePayload = {
  mode: MinesSystemMode;
};

export function parseMinesSystemState(raw: unknown): MinesSystemStatePayload | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const mode = (raw as Record<string, unknown>).mode;
  if (
    mode === MinesSystemMode.ACTIVE ||
    mode === MinesSystemMode.NEW_GAMES_DISABLED ||
    mode === MinesSystemMode.PAUSED
  ) {
    return { mode };
  }
  return null;
}
