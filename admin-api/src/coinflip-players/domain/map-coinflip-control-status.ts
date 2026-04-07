import { CoinflipPlayerControlStatus } from '@prisma/client';
import type { CoinflipPlayerPublicStatus } from './coinflip-player-public-status';

export function mapCoinflipControlStatus(
  status: CoinflipPlayerControlStatus | null | undefined,
): CoinflipPlayerPublicStatus {
  if (status === CoinflipPlayerControlStatus.BANNED) return 'banned';
  if (status === CoinflipPlayerControlStatus.LIMITED) return 'limited';
  return 'active';
}
