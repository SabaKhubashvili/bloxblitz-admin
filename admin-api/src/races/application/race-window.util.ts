import type { RaceWindowLabel } from '../domain/races.repository.port';

export function resolveRaceWindow(
  start: Date,
  end: Date,
  explicit?: string,
): RaceWindowLabel {
  if (explicit === '24h' || explicit === '7d' || explicit === 'custom') {
    return explicit;
  }
  const ms = end.getTime() - start.getTime();
  const hours = ms / 3600000;
  if (Math.abs(hours - 24) <= 0.25) return '24h';
  if (Math.abs(hours - 168) <= 1) return '7d';
  return 'custom';
}
