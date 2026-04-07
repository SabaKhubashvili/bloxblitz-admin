import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CasesChartBucketGranularity,
  CasesChartSeriesRow,
  ICasesChartsRepository,
  PopularCaseByOpensRow,
} from '../domain/cases-charts.repository';

type RevenueRow = { bucket: Date; revenue: string | number | null };
type CountRow = { bucket: Date; openings: bigint | number | null };
type PopularRow = {
  caseId: string;
  name: string;
  price: string | number | null;
  opens: bigint | number | null;
};

@Injectable()
export class PrismaCasesChartsRepository implements ICasesChartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMostPopularCasesByOpens(
    fromInclusive: Date,
    toExclusive: Date,
    limit: number,
  ): Promise<PopularCaseByOpensRow[]> {
    const rows = await this.prisma.$queryRaw<PopularRow[]>(Prisma.sql`
      SELECT
        c.id AS "caseId",
        c.name,
        c.price::double precision AS price,
        COUNT(coh.id)::bigint AS opens
      FROM case_open_history coh
      INNER JOIN cases c ON c.id = coh."caseId"
      WHERE coh."createdAt" >= ${fromInclusive}
        AND coh."createdAt" < ${toExclusive}
      GROUP BY c.id, c.name, c.price
      ORDER BY opens DESC, c.name ASC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      caseId: r.caseId,
      name: r.name,
      price: Number(r.price ?? 0),
      opens: toNumber(r.opens),
    }));
  }

  async aggregateRevenueSeries(
    fromInclusive: Date,
    toExclusive: Date,
    bucket: CasesChartBucketGranularity,
  ): Promise<CasesChartSeriesRow[]> {
    const truncUnit =
      bucket === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<RevenueRow[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, coh."createdAt" AT TIME ZONE 'UTC') AS bucket,
        COALESCE(SUM(coh."pricePaid" - coh."wonItemValue"), 0)::double precision
          AS revenue
      FROM case_open_history coh
      WHERE coh."createdAt" >= ${fromInclusive}
        AND coh."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((r) => ({
      bucketUtc: new Date(r.bucket),
      value: Number(r.revenue ?? 0),
    }));
  }

  async aggregateOpeningsSeries(
    fromInclusive: Date,
    toExclusive: Date,
    bucket: CasesChartBucketGranularity,
  ): Promise<CasesChartSeriesRow[]> {
    const truncUnit =
      bucket === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, coh."createdAt" AT TIME ZONE 'UTC') AS bucket,
        COUNT(*)::bigint AS openings
      FROM case_open_history coh
      WHERE coh."createdAt" >= ${fromInclusive}
        AND coh."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((r) => ({
      bucketUtc: new Date(r.bucket),
      value: toNumber(r.openings),
    }));
  }
}

function toNumber(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
