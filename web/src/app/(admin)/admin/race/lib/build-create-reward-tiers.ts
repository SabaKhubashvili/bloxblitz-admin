/**
 * Builds API `rewards` from the create form: positions 1..N, no gaps, no trailing tiers after first zero.
 * (UI lists index 0 = 1st place.)
 */
export function buildContiguousRewardTiers(
  amounts: number[],
): Array<{ position: number; rewardAmount: number }> {
  const out: Array<{ position: number; rewardAmount: number }> = [];
  for (let i = 0; i < Math.min(amounts.length, 10); i++) {
    const v = Number(amounts[i]);
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`Invalid amount for rank ${i + 1}`);
    }
    if (v === 0) {
      for (let j = i + 1; j < amounts.length; j++) {
        const rest = Number(amounts[j]);
        if (Number.isFinite(rest) && rest > 0) {
          throw new Error(
            `Cannot skip rank ${i + 1}: set all ranks from 1 through your last paid place with no gaps.`,
          );
        }
      }
      break;
    }
    out.push({ position: out.length + 1, rewardAmount: v });
  }
  if (!out.length) {
    throw new Error("At least one positive reward is required.");
  }
  return out;
}
