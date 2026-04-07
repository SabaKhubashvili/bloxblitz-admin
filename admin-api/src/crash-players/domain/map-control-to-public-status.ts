import { CrashPlayerControlStatus } from '@prisma/client';
import type { CrashPlayerPublicStatus } from './crash-player-public-status';

export function mapControlToPublicStatus(
  status: CrashPlayerControlStatus | null | undefined,
): CrashPlayerPublicStatus {
  if (status === CrashPlayerControlStatus.BANNED) return 'banned';
  if (status === CrashPlayerControlStatus.LIMITED) return 'limited';
  return 'active';
}
