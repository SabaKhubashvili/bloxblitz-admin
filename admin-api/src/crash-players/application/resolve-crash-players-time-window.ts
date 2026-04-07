import {
  type RollingAnalyticsPreset,
  rollingWindowBounds,
} from '../../common/rolling-analytics-window';
import type { CrashPlayersTimePreset } from '../domain/crash-player-list.criteria';

export type CustomCrashPlayersWindow = { from: Date; to: Date };

export function resolveCrashPlayersTimeWindow(
  preset: CrashPlayersTimePreset,
  now: Date,
  custom?: CustomCrashPlayersWindow,
): { from: Date; to: Date } {
  if (preset === 'custom') {
    if (!custom) {
      throw new Error('Custom crash players window requires from/to.');
    }
    return { from: custom.from, to: custom.to };
  }
  return rollingWindowBounds(preset as RollingAnalyticsPreset, now);
}
