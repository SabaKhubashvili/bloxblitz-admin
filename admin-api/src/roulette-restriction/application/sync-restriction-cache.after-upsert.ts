import type { RouletteRestrictionCachePort } from './ports/roulette-restriction.cache.port';
import { RouletteRestriction } from '../domain/roulette-restriction.entity';
import type { RouletteRestrictionSnapshot } from '../domain/roulette-restriction.entity';

export async function syncRestrictionCacheAfterUpsert(
  cache: RouletteRestrictionCachePort,
  snapshot: RouletteRestrictionSnapshot,
): Promise<void> {
  await cache.setRestriction(snapshot);
  const entity = RouletteRestriction.fromSnapshot(snapshot);
  if (!entity.hasActiveWagerLimit()) {
    await cache.deleteWagerKeys(snapshot.username);
  }
}
