import type { AdminUserModerationStatus } from './admin-user-moderation-status';

type ControlStatus = 'ACTIVE' | 'LIMITED' | 'BANNED';

export function deriveModerationStatus(
  dice: { status: ControlStatus } | null | undefined,
  mines: { status: ControlStatus } | null | undefined,
  crash: { status: ControlStatus } | null | undefined,
  coinflip: { status: ControlStatus } | null | undefined,
): AdminUserModerationStatus {
  let rank = 0;
  for (const row of [dice, mines, crash, coinflip]) {
    const s = row?.status;
    if (s === 'BANNED') rank = Math.max(rank, 2);
    else if (s === 'LIMITED') rank = Math.max(rank, 1);
  }
  if (rank === 2) return 'BANNED';
  if (rank === 1) return 'LIMITED';
  return 'ACTIVE';
}
