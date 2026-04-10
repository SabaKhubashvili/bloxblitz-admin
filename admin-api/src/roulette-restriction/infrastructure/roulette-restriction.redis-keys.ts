import type { RestrictionTimeframe } from '../domain/restriction-timeframe';

function norm(username: string): string {
  return username.trim().toLowerCase();
}

export function restrictionKey(username: string): string {
  return `roulette:restriction:${norm(username)}`;
}

export function wagerKey(
  username: string,
  timeframe: RestrictionTimeframe,
): string {
  return `roulette:wager:${norm(username)}:${timeframe}`;
}
