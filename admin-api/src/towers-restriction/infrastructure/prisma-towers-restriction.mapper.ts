import type { TowersPlayerRestriction as PrismaRow } from '@prisma/client';
import type { TowersRestrictionSnapshot } from '../domain/towers-restriction.entity';

export function prismaRowToSnapshot(
  row: PrismaRow,
): TowersRestrictionSnapshot {
  return {
    username: row.userUsername,
    banned: row.isBanned,
    banReason: row.banReason,
    dailyWagerLimit: row.dailyWagerLimit,
    weeklyWagerLimit: row.weeklyWagerLimit,
    monthlyWagerLimit: row.monthlyWagerLimit,
    limitReason: row.limitReason,
  };
}
