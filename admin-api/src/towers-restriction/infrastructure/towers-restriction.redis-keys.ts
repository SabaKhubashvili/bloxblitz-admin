import type { TowersWagerWindow } from '../domain/towers-wager-window';

/** Hash: field = lowercase username, value = restriction JSON (admin-api + game API). */
export const TOWERS_RESTRICTIONS_HASH = 'towers:restrictions';

function norm(username: string): string {
  return username.trim().toLowerCase();
}

export function towersRestrictionsHashField(username: string): string {
  return norm(username);
}

export function towersWagerKey(
  username: string,
  window: TowersWagerWindow,
): string {
  return `towers:wager:${window.toLowerCase()}:${norm(username)}`;
}
