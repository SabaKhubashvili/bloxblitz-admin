import { RestrictionTimeframe as PrismaTf } from '@prisma/client';
import type { RestrictionTimeframe } from '../domain/restriction-timeframe';
import type { RouletteRestrictionSnapshot } from '../domain/roulette-restriction.entity';
import type { RoulettePlayerRestriction } from '@prisma/client';

export function prismaTimeframeToDomain(
  tf: PrismaTf | null,
): RestrictionTimeframe | null {
  if (tf == null) return null;
  return tf as RestrictionTimeframe;
}

export function domainTimeframeToPrisma(
  tf: RestrictionTimeframe | null,
): PrismaTf | null {
  if (tf == null) return null;
  return tf as PrismaTf;
}

export function prismaRowToSnapshot(
  row: RoulettePlayerRestriction,
): RouletteRestrictionSnapshot {
  return {
    username: row.userUsername,
    banned: row.isBanned,
    banReason: row.banReason,
    maxWagerAmount: row.maxWagerAmount,
    timeframe: prismaTimeframeToDomain(row.timeframe),
  };
}
