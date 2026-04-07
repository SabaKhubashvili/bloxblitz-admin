import { MinesSystemMode } from '../../domain/mines-system-state';

export type MinesSystemStateClientDto = {
  mode: MinesSystemMode;
  systemPaused: boolean;
  newGamesDisabled: boolean;
};

export function toClientSystemState(payload: {
  mode: MinesSystemMode;
}): MinesSystemStateClientDto {
  const { mode } = payload;
  return {
    mode,
    systemPaused: mode === MinesSystemMode.PAUSED,
    newGamesDisabled:
      mode === MinesSystemMode.NEW_GAMES_DISABLED ||
      mode === MinesSystemMode.PAUSED,
  };
}
