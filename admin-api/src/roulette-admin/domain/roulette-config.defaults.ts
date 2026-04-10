/** Redis hash for roulette admin settings (shared with WebSocket service). */
export const ROULETTE_ADMIN_CONFIG_REDIS_KEY = 'roulette:admin:config';

export type RouletteAdminConfig = {
  minBet: number;
  maxBet: number;
  /** When false, WS stops new rounds and rejects bets. */
  gameEnabled: boolean;
  /** When false, rounds may continue but all place-bet requests are rejected. */
  bettingEnabled: boolean;
};

export const DEFAULT_ROULETTE_ADMIN_CONFIG: RouletteAdminConfig = {
  minBet: 0.01,
  maxBet: 5000,
  gameEnabled: true,
  bettingEnabled: true,
};

export function cloneRouletteAdminConfig(
  c: RouletteAdminConfig,
): RouletteAdminConfig {
  return { ...c };
}
