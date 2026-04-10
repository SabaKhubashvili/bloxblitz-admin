import type { TowersRestrictionSnapshot } from '../../domain/towers-restriction.entity';

export const TOWERS_RESTRICTION_CACHE = Symbol('TOWERS_RESTRICTION_CACHE');

export type TowersRestrictionCachePort = {
  setRestriction(snapshot: TowersRestrictionSnapshot): Promise<void>;
  deleteRestriction(username: string): Promise<void>;
  deleteWagerKeys(username: string): Promise<void>;
};
