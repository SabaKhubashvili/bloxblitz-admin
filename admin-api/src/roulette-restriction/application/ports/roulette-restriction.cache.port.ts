import type { RouletteRestrictionSnapshot } from '../../domain/roulette-restriction.entity';
import type { RestrictionTimeframe } from '../../domain/restriction-timeframe';

export const ROULETTE_RESTRICTION_CACHE = Symbol('ROULETTE_RESTRICTION_CACHE');

export interface RouletteRestrictionCachePort {
  getRestriction(username: string): Promise<RouletteRestrictionSnapshot | null>;
  setRestriction(snapshot: RouletteRestrictionSnapshot): Promise<void>;
  deleteRestriction(username: string): Promise<void>;
  deleteWagerKeys(username: string): Promise<void>;

  /**
   * Atomically adds `amount` to the rolling wager total if `current + amount <= maxTotal`.
   * On first write, starts TTL. Returns whether the increment was applied.
   */
  addWagerIfWithinMax(
    username: string,
    timeframe: RestrictionTimeframe,
    amount: number,
    maxTotal: number,
    ttlSeconds: number,
  ): Promise<{ ok: boolean; newTotal: number }>;
}
