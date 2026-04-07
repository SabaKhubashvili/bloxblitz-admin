/**
 * Maps `CaseItem.variant` (subset of { M, N, F, R }) to the correct `pets` value column.
 * Aligned with BloxBlitz_Amp `case-item-pet-value.ts`.
 */
export type PetValueColumnRow = {
  rvalue_nopotion: number;
  rvalue_ride: number;
  rvalue_fly: number;
  rvalue_flyride: number;
  nvalue_nopotion: number;
  nvalue_ride: number;
  nvalue_fly: number;
  nvalue_flyride: number;
  mvalue_nopotion: number;
  mvalue_ride: number;
  mvalue_fly: number;
  mvalue_flyride: number;
};

function lineFromVariants(
  variants: ReadonlySet<string>,
): 'mvalue' | 'nvalue' | 'rvalue' {
  if (variants.has('M')) return 'mvalue';
  if (variants.has('N')) return 'nvalue';
  return 'rvalue';
}

function comboFromVariants(
  variants: ReadonlySet<string>,
): 'nopotion' | 'ride' | 'fly' | 'flyride' {
  const hasF = variants.has('F');
  const hasR = variants.has('R');
  if (hasF && hasR) return 'flyride';
  if (hasR) return 'ride';
  if (hasF) return 'fly';
  return 'nopotion';
}

export function resolvePetValueForCaseItemVariants(
  pet: PetValueColumnRow,
  variants: readonly string[],
): number {
  const set = new Set(variants.map((v) => String(v).toUpperCase()));
  const line = lineFromVariants(set);
  const combo = comboFromVariants(set);
  const column = `${line}_${combo}` as keyof PetValueColumnRow;

  const v = pet[column];
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return v;
}
