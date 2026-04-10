import {
  TOWERS_CONFIG_DEFAULTS,
  type TowersConfigPayload,
} from './towers-config.defaults';

const DIFF_SET = new Set(TOWERS_CONFIG_DEFAULTS.allowedDifficulties);

function isPosNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

export function parseTowersConfigFromUnknown(
  raw: unknown,
): TowersConfigPayload | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const minBet = o.minBet;
  const maxBet = o.maxBet;
  const allowedDifficulties = o.allowedDifficulties;
  const allowedLevels = o.allowedLevels;
  if (!isPosNum(minBet) || !isPosNum(maxBet)) return null;
  if (minBet > maxBet) return null;
  if (!Array.isArray(allowedDifficulties) || allowedDifficulties.length === 0) {
    return null;
  }
  const diffs = allowedDifficulties.filter(
    (d): d is string => typeof d === 'string' && DIFF_SET.has(d),
  );
  if (diffs.length === 0) return null;
  if (!Array.isArray(allowedLevels) || allowedLevels.length === 0) return null;
  const levels = allowedLevels
    .filter((x): x is number => typeof x === 'number' && Number.isInteger(x))
    .filter((x) => x > 0 && x <= 64);
  if (levels.length === 0) return null;
  const uniq = [...new Set(levels)].sort((a, b) => a - b);
  return {
    minBet,
    maxBet,
    allowedDifficulties: [...new Set(diffs)],
    allowedLevels: uniq,
  };
}

export function isValidTowersConfigNumbers(
  minBet: number,
  maxBet: number,
): boolean {
  return isPosNum(minBet) && isPosNum(maxBet) && minBet <= maxBet;
}
