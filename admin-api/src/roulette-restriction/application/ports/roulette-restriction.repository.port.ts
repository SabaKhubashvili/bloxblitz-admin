import type { RouletteRestrictionSnapshot } from '../../domain/roulette-restriction.entity';
import type { RestrictionTimeframe } from '../../domain/restriction-timeframe';

export interface UpsertRouletteRestrictionInput {
  /** Canonical `User.username` (lowercase). */
  username: string;
  isBanned: boolean;
  banReason: string | null;
  maxWagerAmount: number | null;
  timeframe: RestrictionTimeframe | null;
}

export const ROULETTE_RESTRICTION_REPOSITORY = Symbol(
  'ROULETTE_RESTRICTION_REPOSITORY',
);

export interface RouletteRestrictionRepositoryPort {
  /** Returns DB `User.username` if the account exists. */
  resolveUsername(raw: string): Promise<string | null>;
  findByUsername(username: string): Promise<RouletteRestrictionSnapshot | null>;
  findAll(): Promise<RouletteRestrictionSnapshot[]>;
  upsert(input: UpsertRouletteRestrictionInput): Promise<RouletteRestrictionSnapshot>;
  deleteByUsername(username: string): Promise<void>;
}
