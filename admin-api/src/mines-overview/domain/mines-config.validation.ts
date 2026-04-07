import type { MinesConfigPayload } from './mines-config.defaults';

/**
 * Shared numeric rules for mines economics (mirrors mines-config.redis.service parseStored).
 */
export function isValidMinesConfigNumbers(
  minBet: number,
  maxBet: number,
  houseEdge: number,
  rtpTarget: number,
): boolean {
  if (![minBet, maxBet, houseEdge, rtpTarget].every(Number.isFinite)) {
    return false;
  }
  if (minBet < 0 || maxBet <= minBet) return false;
  if (houseEdge < 0 || houseEdge > 100) return false;
  if (rtpTarget < 0 || rtpTarget > 100) return false;
  return true;
}

export function parseMinesConfigFromUnknown(
  o: unknown,
): MinesConfigPayload | null {
  if (!o || typeof o !== 'object') return null;
  const p = o as Record<string, unknown>;
  const minBet = Number(p.minBet);
  const maxBet = Number(p.maxBet);
  const houseEdge = Number(p.houseEdge);
  const rtpTarget = Number(p.rtpTarget);
  if (!isValidMinesConfigNumbers(minBet, maxBet, houseEdge, rtpTarget)) {
    return null;
  }
  return { minBet, maxBet, houseEdge, rtpTarget };
}
