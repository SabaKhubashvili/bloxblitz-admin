import { BadRequestException } from '@nestjs/common';

export type RewardTierPlain = {
  position: number;
  rewardAmount: number;
};

/**
 * Validates tiers for admin race creation:
 * - 1–10 tiers, unique positions, amounts > 0
 * - Positions must be exactly 1..N when sorted (no gaps, no duplicates)
 */
export function assertValidRaceRewardTiers(tiers: RewardTierPlain[]): void {
  if (!tiers?.length) {
    throw new BadRequestException('At least one reward tier is required');
  }
  if (tiers.length > 10) {
    throw new BadRequestException('At most 10 reward tiers are allowed');
  }

  const sorted = [...tiers].sort((a, b) => a.position - b.position);
  const seen = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    const { position, rewardAmount } = sorted[i]!;

    if (!Number.isInteger(position)) {
      throw new BadRequestException('Each position must be an integer');
    }
    if (position < 1 || position > 10) {
      throw new BadRequestException('Position must be between 1 and 10');
    }
    if (seen.has(position)) {
      throw new BadRequestException(`Duplicate position: ${position}`);
    }
    seen.add(position);

    if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) {
      throw new BadRequestException(
        `rewardAmount must be positive for position ${position}`,
      );
    }

    if (position !== i + 1) {
      throw new BadRequestException(
        'Positions must be sequential starting at 1 with no gaps (e.g. 1,2,3 — not 1,3)',
      );
    }
  }
}
