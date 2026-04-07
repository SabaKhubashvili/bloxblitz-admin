import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CasesOverviewAggregate,
  ICasesOverviewRepository,
  RecentCaseOpenRow,
} from '../domain/cases-overview.repository';

type OverviewRow = {
  total_cases: bigint | number | null;
  active_cases: bigint | number | null;
  total_opened: bigint | number | null;
  total_revenue: string | number | null;
};

@Injectable()
export class PrismaCasesOverviewRepository implements ICasesOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateOverview(
    opensFromInclusive: Date,
    opensToExclusive: Date,
  ): Promise<CasesOverviewAggregate> {
    const rows = await this.prisma.$queryRaw<OverviewRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::bigint FROM cases) AS total_cases,
        (
          SELECT COUNT(*)::bigint FROM cases WHERE "isActive" = true
        ) AS active_cases,
        (
          SELECT COUNT(*)::bigint FROM case_open_history
          WHERE "createdAt" >= ${opensFromInclusive}
            AND "createdAt" < ${opensToExclusive}
        ) AS total_opened,
        (
          SELECT COALESCE(
            SUM("pricePaid" - "wonItemValue"),
            0
          )::double precision
          FROM case_open_history
          WHERE "createdAt" >= ${opensFromInclusive}
            AND "createdAt" < ${opensToExclusive}
        ) AS total_revenue
    `);

    const r = rows[0];
    return {
      totalCases: toBigIntNumber(r?.total_cases),
      activeCases: toBigIntNumber(r?.active_cases),
      totalOpened: toBigIntNumber(r?.total_opened),
      totalRevenue: Number(r?.total_revenue ?? 0),
    };
  }

  async findRecentOpens(limit: number): Promise<RecentCaseOpenRow[]> {
    const take = Math.min(Math.max(1, limit), 100);
    const rows = await this.prisma.caseOpenHistory.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userUsername: true,
        createdAt: true,
        wonItemValue: true,
        case: { select: { name: true } },
        wonItem: { select: { pet: { select: { name: true } } } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      userUsername: r.userUsername,
      caseName: r.case.name,
      itemWon: r.wonItem.pet.name,
      wonItemValue: decimalToNumber(r.wonItemValue),
      createdAt: r.createdAt,
    }));
  }

  async findAllCaseSlugs(): Promise<string[]> {
    const rows = await this.prisma.case.findMany({
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }

  async setAllCasesActive(isActive: boolean): Promise<number> {
    const result = await this.prisma.case.updateMany({
      data: { isActive },
    });
    return result.count;
  }
}

function toBigIntNumber(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}

function decimalToNumber(
  v: Prisma.Decimal | string | number | null | undefined,
): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return Number(v);
}
