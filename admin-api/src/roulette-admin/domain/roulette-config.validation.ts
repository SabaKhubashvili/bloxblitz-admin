import type { RouletteAdminConfig } from './roulette-config.defaults';
import { DEFAULT_ROULETTE_ADMIN_CONFIG } from './roulette-config.defaults';

export function rouletteConfigFromRedisHash(
  hash: Record<string, string>,
  defaults: RouletteAdminConfig,
): RouletteAdminConfig {
  const num = (k: string, d: number) => {
    const v = hash[k];
    if (v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const bool = (k: string, d: boolean) => {
    const v = hash[k];
    if (v === undefined || v === '') return d;
    return v === '1' || v === 'true' || v === 'TRUE';
  };
  return {
    minBet: num('minBet', defaults.minBet),
    maxBet: num('maxBet', defaults.maxBet),
    gameEnabled: bool('gameEnabled', defaults.gameEnabled),
    bettingEnabled: bool('bettingEnabled', defaults.bettingEnabled),
  };
}

export function rouletteConfigToRedisFields(
  c: RouletteAdminConfig,
): Record<string, string> {
  return {
    minBet: String(c.minBet),
    maxBet: String(c.maxBet),
    gameEnabled: c.gameEnabled ? '1' : '0',
    bettingEnabled: c.bettingEnabled ? '1' : '0',
  };
}

export function validateRouletteAdminConfig(c: RouletteAdminConfig): boolean {
  if (!Number.isFinite(c.minBet) || !Number.isFinite(c.maxBet)) return false;
  if (c.minBet < 0.01 || c.maxBet < c.minBet) return false;
  if (c.maxBet > 1_000_000) return false;
  return true;
}

export function hashMissingAnyField(
  hash: Record<string, string>,
): boolean {
  const full = rouletteConfigToRedisFields(DEFAULT_ROULETTE_ADMIN_CONFIG);
  return Object.keys(full).some((k) => hash[k] === undefined);
}
