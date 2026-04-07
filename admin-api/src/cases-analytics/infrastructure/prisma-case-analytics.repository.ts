import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CaseAnalyticsOverviewAggregate,
  CaseDropDistributionRow,
  CaseMostWonItemRow,
  CaseOpenRateBucketRow,
  ICaseAnalyticsRepository,
} from '../domain/case-analytics.repository';

type OverviewRaw = {
  total_opened: bigint | number | null;
  revenue: string | number | null;
  won_sum: string | number | null;
  paid_sum: string | number | null;
};

type MostWonRaw = { name: string; drop_count: bigint | number | null };

type OpenRateRaw = { bucket: Date; openings: bigint | number | null };

type DropDistRaw = { item_name: string; drop_count: bigint | number | null };

@Injectable()
export class PrismaCaseAnalyticsRepository implements ICaseAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assertCaseExists(caseId: string): Promise<boolean> {
    const row = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });
    return row !== null;
  }

  async aggregateOverview(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<CaseAnalyticsOverviewAggregate> {
    const rows = await this.prisma.$queryRaw<OverviewRaw[]>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_opened,
        COALESCE(SUM(coh."pricePaid"), 0)::double precision AS revenue,
        COALESCE(SUM(coh."wonItemValue"), 0)::double precision AS won_sum,
        COALESCE(SUM(coh."pricePaid"), 0)::double precision AS paid_sum
      FROM case_open_history coh
      WHERE coh."caseId" = ${caseId}
        AND coh."createdAt" >= ${fromInclusive}
        AND coh."createdAt" < ${toExclusive}
    `);
    const r = rows[0];
    const totalOpened = toBigIntNumber(r?.total_opened);
    const revenue = Number(r?.revenue ?? 0);
    const paidSum = Number(r?.paid_sum ?? 0);
    const wonSum = Number(r?.won_sum ?? 0);
    const avgRtp =
      paidSum > 0 ? Math.round((wonSum / paidSum) * 10_000) / 100 : 0;
    return { totalOpened, revenue, avgRtp };
  }

  async findMostWonItems(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
    limit: number,
  ): Promise<CaseMostWonItemRow[]> {
    const rows = await this.prisma.$queryRaw<MostWonRaw[]>(Prisma.sql`
      SELECT
        p.name AS name,
        COUNT(*)::bigint AS drop_count
      FROM case_open_history coh
      INNER JOIN case_items ci ON ci.id = coh."wonCaseItemId"
      INNER JOIN pets p ON p.id = ci."petId"
      WHERE coh."caseId" = ${caseId}
        AND coh."createdAt" >= ${fromInclusive}
        AND coh."createdAt" < ${toExclusive}
      GROUP BY p.name
      ORDER BY drop_count DESC, p.name ASC
      LIMIT ${limit}
    `);
    return rows.map((row) => ({
      name: row.name,
      dropCount: toBigIntNumber(row.drop_count),
    }));
  }

  async aggregateOpenRate(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
    granularity: 'hour' | 'day',
  ): Promise<CaseOpenRateBucketRow[]> {
    const truncUnit =
      granularity === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<OpenRateRaw[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, coh."createdAt" AT TIME ZONE 'UTC') AS bucket,
        COUNT(*)::bigint AS openings
      FROM case_open_history coh
      WHERE coh."caseId" = ${caseId}
        AND coh."createdAt" >= ${fromInclusive}
        AND coh."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((row) => ({
      bucketUtc: new Date(row.bucket),
      openCount: toBigIntNumber(row.openings),
    }));
  }

  async aggregateDropDistribution(
    caseId: string,
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<CaseDropDistributionRow[]> {
    const rows = await this.prisma.$queryRaw<DropDistRaw[]>(Prisma.sql`
      SELECT
        p.name AS item_name,
        COUNT(*)::bigint AS drop_count
      FROM case_open_history coh
      INNER JOIN case_items ci ON ci.id = coh."wonCaseItemId"
      INNER JOIN pets p ON p.id = ci."petId"
      WHERE coh."caseId" = ${caseId}
        AND coh."createdAt" >= ${fromInclusive}
        AND coh."createdAt" < ${toExclusive}
      GROUP BY p.name
      ORDER BY drop_count DESC, p.name ASC
    `);
    return rows.map((row) => ({
      itemName: row.item_name,
      dropCount: toBigIntNumber(row.drop_count),
    }));
  }
}

function toBigIntNumber(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
