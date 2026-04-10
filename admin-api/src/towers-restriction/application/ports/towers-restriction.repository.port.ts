import type { TowersRestrictionSnapshot } from '../../domain/towers-restriction.entity';

export type UpsertTowersRestrictionInput = {
  username: string;
  isBanned: boolean;
  banReason: string | null;
  dailyWagerLimit: number | null;
  weeklyWagerLimit: number | null;
  monthlyWagerLimit: number | null;
  limitReason: string | null;
};

export const TOWERS_RESTRICTION_REPOSITORY = Symbol('TOWERS_RESTRICTION_REPOSITORY');

export type TowersRestrictionRepositoryPort = {
  resolveUsername(raw: string): Promise<string | null>;
  findByUsername(username: string): Promise<TowersRestrictionSnapshot | null>;
  findAll(): Promise<TowersRestrictionSnapshot[]>;
  upsert(input: UpsertTowersRestrictionInput): Promise<TowersRestrictionSnapshot>;
  deleteByUsername(username: string): Promise<void>;
};
