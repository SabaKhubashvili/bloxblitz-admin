import { BadRequestException } from '@nestjs/common';
import { Variant } from '@prisma/client';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV4(s: string): boolean {
  return UUID_V4.test(s);
}

export function toPrismaVariants(variant: string[]): Variant[] {
  const out: Variant[] = [];
  for (const raw of variant) {
    const v = String(raw).toUpperCase();
    if (v === 'M') out.push(Variant.M);
    else if (v === 'N') out.push(Variant.N);
    else if (v === 'F') out.push(Variant.F);
    else if (v === 'R') out.push(Variant.R);
  }
  return out;
}

export function dropChancesToWeights(percents: number[]): number[] {
  const clean = percents.map((p) => Math.max(0, Number(p)));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    throw new BadRequestException('Drop chances must sum to a positive total');
  }
  if (Math.abs(sum - 100) > 0.06) {
    throw new BadRequestException('Drop chances must total 100%');
  }
  const n = clean.length;
  let acc = 0;
  return clean.map((p, idx) => {
    if (idx === n - 1) {
      return Math.max(1, 10_000 - acc);
    }
    const w = Math.max(1, Math.round((p / sum) * 10_000));
    acc += w;
    return w;
  });
}
