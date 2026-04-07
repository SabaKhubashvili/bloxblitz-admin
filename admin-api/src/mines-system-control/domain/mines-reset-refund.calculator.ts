import { MINES_CONFIG_DEFAULTS } from '../../mines-overview/domain/mines-config.defaults';

/** Shape stored at `mines:game:{id}` in Redis (game API). */
export type MinesRedisGameBlob = {
  id: string;
  username: string;
  betAmount: number;
  mineCount: number;
  gridSize: number;
  revealedTiles: number[];
  status: string;
  houseEdge?: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function resolveHouseEdgePercent(blob: MinesRedisGameBlob): number {
  const h = Number(blob.houseEdge);
  if (Number.isFinite(h) && h >= 0 && h <= 100) {
    return h;
  }
  return MINES_CONFIG_DEFAULTS.houseEdge;
}

/**
 * Same stepping formula as domain `MinesGame.calculateMultiplier` (safe tiles only).
 */
export function multiplierForSafeReveals(
  gridSize: number,
  mineCount: number,
  revealedSafeCount: number,
  houseEdgePercent: number,
): number {
  const n = gridSize;
  const m = mineCount;
  const r = revealedSafeCount;
  if (r <= 0) return 1;

  let multiplier = 1;
  for (let i = 0; i < r; i++) {
    multiplier *= (n - i) / (n - m - i);
  }
  const edgeFactor = 1 - houseEdgePercent / 100;
  return Math.round(multiplier * edgeFactor * 10_000) / 10_000;
}

/**
 * Gross balance credit: full stake refund if no tile revealed, else bet × current multiplier
 * (same payout as an immediate cashout).
 */
export function grossCreditForAdminReset(blob: MinesRedisGameBlob): number {
  const bet = Number(blob.betAmount);
  if (!Number.isFinite(bet) || bet <= 0) {
    return 0;
  }
  const revealed = Array.isArray(blob.revealedTiles) ? blob.revealedTiles.length : 0;
  if (revealed === 0) {
    return round2(bet);
  }
  const edge = resolveHouseEdgePercent(blob);
  const mult = multiplierForSafeReveals(
    blob.gridSize,
    blob.mineCount,
    revealed,
    edge,
  );
  return round2(bet * mult);
}

/** Net player profit for `GameHistory.profit` after admin reset. */
export function netProfitForCancelledGame(
  betAmount: number,
  grossCredit: number,
): number {
  return round2(grossCredit - betAmount);
}

/** Current multiplier for history / audit (1 when no reveals). */
export function currentMultiplierForSnapshot(blob: MinesRedisGameBlob): number {
  const revealed = Array.isArray(blob.revealedTiles) ? blob.revealedTiles.length : 0;
  if (revealed === 0) return 1;
  return multiplierForSafeReveals(
    blob.gridSize,
    blob.mineCount,
    revealed,
    resolveHouseEdgePercent(blob),
  );
}
