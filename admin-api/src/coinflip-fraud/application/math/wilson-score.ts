/**
 * Lower bound of Wilson score confidence interval for binomial proportion.
 * Used instead of naive win% to avoid over-flagging low-N runs.
 */
export function wilsonLowerBound(wins: number, n: number, z: number = 1.96): number {
  if (n <= 0) return 0;
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return (center - margin) / denom;
}

export function meanAndCv(samples: number[]): { mean: number; cv: number } {
  if (samples.length === 0) return { mean: 0, cv: 1 };
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  if (mean === 0) return { mean: 0, cv: 1 };
  const varPop =
    samples.reduce((acc, s) => acc + (s - mean) ** 2, 0) / samples.length;
  const std = Math.sqrt(varPop);
  return { mean, cv: std / mean };
}

export function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}
