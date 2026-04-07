import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolvePetValueForCaseItemVariants } from '../domain/case-item-pet-value';
import type {
  CaseListCaseItemRow,
  CaseListRow,
  ICasesListRepository,
  ListCasesPaginatedInput,
} from '../domain/cases-list.repository';

const petValueSelect = {
  name: true,
  image: true,
  rarity: true,
  rvalue_nopotion: true,
  rvalue_ride: true,
  rvalue_fly: true,
  rvalue_flyride: true,
  nvalue_nopotion: true,
  nvalue_ride: true,
  nvalue_fly: true,
  nvalue_flyride: true,
  mvalue_nopotion: true,
  mvalue_ride: true,
  mvalue_fly: true,
  mvalue_flyride: true,
} as const;

@Injectable()
export class PrismaCasesListRepository implements ICasesListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPaginated(
    input: ListCasesPaginatedInput,
  ): Promise<{ total: number; cases: CaseListRow[] }> {
    const { page, pageSize, search, statusFilter } = input;
    const where: Prisma.CaseWhereInput = {};
    const q = search?.trim();
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }
    if (statusFilter === 'active') where.isActive = true;
    if (statusFilter === 'disabled') where.isActive = false;

    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          name: true,
          imageUrl: true,
          price: true,
          isActive: true,
          createdAt: true,
          _count: { select: { opens: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              petId: true,
              weight: true,
              sortOrder: true,
              variant: true,
              pet: { select: petValueSelect },
            },
          },
        },
      }),
    ]);

    const cases: CaseListRow[] = rows.map((r) => {
      const items = r.items;
      const totalWeight = items.reduce((s, it) => s + Math.max(0, it.weight), 0);
      const n = items.length;
      const equalPct = n > 0 ? Math.round((10000 / n)) / 100 : 0;
      let accPct = 0;
      const caseItems: CaseListCaseItemRow[] = items.map((it, idx) => {
        const p = it.pet;
        const variant = it.variant.map((v) => String(v));
        const value = resolvePetValueForCaseItemVariants(p, variant);
        const w = Math.max(0, it.weight);
        let dropChance: number;
        if (totalWeight > 0) {
          if (idx === n - 1) {
            dropChance = Math.round((100 - accPct) * 100) / 100;
          } else {
            dropChance = Math.round((w / totalWeight) * 10000) / 100;
            accPct += dropChance;
          }
        } else {
          dropChance = idx === n - 1 ? Math.round((100 - accPct) * 100) / 100 : equalPct;
          accPct += dropChance;
        }
        return {
          id: it.id,
          petId: it.petId,
          name: p.name,
          value,
          variant,
          dropChance,
          imageUrl: p.image,
          rarity: p.rarity,
          petValues: {
            rvalue_nopotion: p.rvalue_nopotion,
            rvalue_ride: p.rvalue_ride,
            rvalue_fly: p.rvalue_fly,
            rvalue_flyride: p.rvalue_flyride,
            nvalue_nopotion: p.nvalue_nopotion,
            nvalue_ride: p.nvalue_ride,
            nvalue_fly: p.nvalue_fly,
            nvalue_flyride: p.nvalue_flyride,
            mvalue_nopotion: p.mvalue_nopotion,
            mvalue_ride: p.mvalue_ride,
            mvalue_fly: p.mvalue_fly,
            mvalue_flyride: p.mvalue_flyride,
          },
        };
      });
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        imageUrl: r.imageUrl,
        price: Number(r.price),
        opened: r._count.opens,
        status: r.isActive ? 'active' : 'disabled',
        createdAt: r.createdAt.toISOString(),
        caseItems,
      };
    });

    return { total, cases };
  }
}
