import type { TowersRestrictionCachePort } from './ports/towers-restriction.cache.port';
import {
  TowersPlayerRestriction,
  type TowersRestrictionSnapshot,
} from '../domain/towers-restriction.entity';

export async function syncTowersRestrictionCacheAfterUpsert(
  cache: TowersRestrictionCachePort,
  snapshot: TowersRestrictionSnapshot,
): Promise<void> {
  await cache.setRestriction(snapshot);
  const entity = TowersPlayerRestriction.fromSnapshot(snapshot);
  if (!entity.hasAnyWagerLimit()) {
    await cache.deleteWagerKeys(snapshot.username);
  }
}
