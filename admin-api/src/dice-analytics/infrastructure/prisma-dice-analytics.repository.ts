import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IDiceAnalyticsRepository,
  DiceOverviewMetricsRow,
  DiceRollDistributionRow,
  DiceProfitBucketRow,
  DiceBetRangeRow,
  DiceRecentGameRow,
  DiceRecentGamesListFilter,
  DiceTargetRangePctRow,
  DiceScatterSeries,
  DiceRiskPostureRow,
  DiceScatterQueryOpts,
  DicePlayersListFilter,
  DicePlayerAggregateDbRow,
  DicePlayersSortField,
  DicePlayersModerationFilter,
} from '../domain/dice-analytics.repository.port';

const SCATTER_LOW_CEIL = 150;
const SCATTER_LOW_BUCKETS = 14;
const SCATTER_HIGH_BUCKETS = 14;
const SCATTER_HIGH_CAP = 50_000;

type OverviewSql = {
  total_rolls: bigint | number | null;
  total_wagered: string | number | null;
  platform_profit: string | number | null;
  active_players: bigint | number | null;
};

type RollDistSql = { value: number; count: bigint | number | null };

type ProfitBucketSql = {
  bucket: Date;
  net: string | number | null;
};

type BetHistSql = {
  range_label: string;
  cnt: bigint | number | null;
};

@Injectable()
export class PrismaDiceAnalyticsRepository implements IDiceAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateOverview(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceOverviewMetricsRow> {
    const rows = await this.prisma.$queryRaw<OverviewSql[]>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_rolls,
        COALESCE(SUM(d."betAmount"), 0)::double precision AS total_wagered,
        (
          COALESCE(SUM(d."betAmount"), 0) - COALESCE(SUM(d."payout"), 0)
        )::double precision AS platform_profit,
        COUNT(DISTINCT d."userUsername")::bigint AS active_players
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
    `);
    const r = rows[0];
    return {
      totalRolls: toInt(r?.total_rolls),
      totalWagered: Number(r?.total_wagered ?? 0),
      profit: Number(r?.platform_profit ?? 0),
      activePlayers: toInt(r?.active_players),
    };
  }

  async aggregateRollDistribution(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceRollDistributionRow[]> {
    const rows = await this.prisma.$queryRaw<RollDistSql[]>(Prisma.sql`
      WITH series AS (
        SELECT generate_series(0, 100) AS v
      ),
      counts AS (
        SELECT
          LEAST(
            100,
            GREATEST(0, ROUND(d."rollResult"::numeric)::int)
          ) AS v,
          COUNT(*)::bigint AS cnt
        FROM "DiceBet" d
        WHERE d."createdAt" >= ${fromInclusive}
          AND d."createdAt" < ${toExclusive}
        GROUP BY 1
      )
      SELECT s.v AS value, COALESCE(c.cnt, 0)::bigint AS count
      FROM series s
      LEFT JOIN counts c ON c.v = s.v
      ORDER BY s.v ASC
    `);
    return rows.map((row) => ({
      value: Number(row.value),
      count: toInt(row.count),
    }));
  }

  async aggregateProfitByBucket(
    fromInclusive: Date,
    toExclusive: Date,
    gran: 'hour' | 'day',
  ): Promise<DiceProfitBucketRow[]> {
    const truncUnit =
      gran === 'hour' ? Prisma.raw(`'hour'`) : Prisma.raw(`'day'`);
    const rows = await this.prisma.$queryRaw<ProfitBucketSql[]>(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, d."createdAt" AT TIME ZONE 'UTC') AS bucket,
        (
          COALESCE(SUM(d."betAmount"), 0) - COALESCE(SUM(d."payout"), 0)
        )::double precision AS net
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((row) => ({
      bucket: new Date(row.bucket),
      net: Number(row.net ?? 0),
    }));
  }

  async aggregateBetSizeHistogram(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceBetRangeRow[]> {
    const rows = await this.prisma.$queryRaw<BetHistSql[]>(Prisma.sql`
      SELECT
        CASE
          WHEN d."betAmount" >= 0 AND d."betAmount" < 1 THEN '0–1'
          WHEN d."betAmount" >= 1 AND d."betAmount" < 10 THEN '1–10'
          WHEN d."betAmount" >= 10 AND d."betAmount" < 100 THEN '10–100'
          ELSE '100+'
        END AS range_label,
        COUNT(*)::bigint AS cnt
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
      GROUP BY 1
    `);
    const byLabel = new Map(
      rows.map((r) => [r.range_label, toInt(r.cnt)] as const),
    );
    const order = ['0–1', '1–10', '10–100', '100+'] as const;
    return order.map((label) => ({
      range: label,
      count: byLabel.get(label) ?? 0,
    }));
  }

  async findRecentDiceGames(
    filters: DiceRecentGamesListFilter,
    limit: number,
  ): Promise<DiceRecentGameRow[]> {
    const where: Prisma.DiceBetWhereInput = {};

    if (filters.minBet !== undefined && filters.minBet > 0) {
      where.betAmount = { gte: filters.minBet };
    }

    if (filters.side === 'over') {
      where.rollMode = 'OVER';
    } else if (filters.side === 'under') {
      where.rollMode = 'UNDER';
    }

    const player = filters.player?.trim();
    if (player) {
      if (isLikelyUuid(player)) {
        where.user = { id: player };
      } else {
        where.userUsername = { contains: player, mode: 'insensitive' };
      }
    }

    const rows = await this.prisma.diceBet.findMany({
      where,
      select: {
        id: true,
        userUsername: true,
        betAmount: true,
        payout: true,
        profit: true,
        rollResult: true,
        chance: true,
        rollMode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => ({
      id: r.id,
      userUsername: r.userUsername,
      betAmount: decimalToNumber(r.betAmount),
      payout: decimalToNumber(r.payout),
      profit: decimalToNumber(r.profit),
      rollResult: decimalToNumber(r.rollResult),
      chance: decimalToNumber(r.chance),
      rollMode: r.rollMode,
      createdAt: r.createdAt,
    }));
  }

  async aggregateRollHeatmap10x10(
    fromInclusive: Date,
    toExclusive: Date,
    player?: string,
  ): Promise<number[][]> {
    const grid = Array.from({ length: 10 }, () => Array(10).fill(0));
    const pSql = dicePlayerFilterSql(player);
    type Cell = { ri: number; ci: number; cnt: bigint | number | null };
    const rows = await this.prisma.$queryRaw<Cell[]>(Prisma.sql`
      SELECT
        (LEAST(
          99,
          GREATEST(0, ROUND(d."rollResult"::numeric)::int)
        ) / 10)::int AS ri,
        MOD(
          LEAST(99, GREATEST(0, ROUND(d."rollResult"::numeric)::int)),
          10
        )::int AS ci,
        COUNT(*)::bigint AS cnt
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
        ${pSql}
      GROUP BY 1, 2
    `);
    for (const row of rows) {
      const ri = Number(row.ri);
      const ci = Number(row.ci);
      if (ri >= 0 && ri < 10 && ci >= 0 && ci < 10) {
        grid[ri]![ci] = toInt(row.cnt);
      }
    }
    return grid;
  }

  async aggregateTargetChanceRanges(
    fromInclusive: Date,
    toExclusive: Date,
    player?: string,
  ): Promise<DiceTargetRangePctRow[]> {
    const pSql = dicePlayerFilterSql(player);
    type Row = { bidx: number; cnt: bigint | number | null };
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT
        LEAST(
          9,
          FLOOR(LEAST(d."chance"::numeric, 99.999999) / 10)::int
        ) AS bidx,
        COUNT(*)::bigint AS cnt
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
        ${pSql}
      GROUP BY 1
    `);
    const total = rows.reduce((s, r) => s + toInt(r.cnt), 0);
    const byIdx = new Map(rows.map((r) => [Number(r.bidx), toInt(r.cnt)]));
    const out: DiceTargetRangePctRow[] = [];
    for (let i = 0; i < 10; i++) {
      const label =
        i === 9 ? '90-100' : `${i * 10}-${(i + 1) * 10}`;
      const cnt = byIdx.get(i) ?? 0;
      const pct =
        total > 0 ? Math.round((cnt * 10_000) / total) / 100 : 0;
      out.push({ range: label, pct });
    }
    return out;
  }

  async aggregateWinRateScatter(
    fromInclusive: Date,
    toExclusive: Date,
    opts?: DiceScatterQueryOpts,
  ): Promise<DiceScatterSeries> {
    const pSql = dicePlayerFilterSql(opts?.player);
    const minSql =
      opts?.minBet != null && opts.minBet > 0
        ? Prisma.sql`AND d."betAmount" >= ${opts.minBet}`
        : Prisma.empty;
    const maxSql =
      opts?.maxBet != null && opts.maxBet > 0
        ? Prisma.sql`AND d."betAmount" <= ${opts.maxBet}`
        : Prisma.empty;

    type Pt = { x: number | null; y: number | null };
    const lowRows = await this.prisma.$queryRaw<Pt[]>(Prisma.sql`
      SELECT
        AVG(d."betAmount"::double precision) AS x,
        (
          100.0 * SUM(CASE WHEN d."profit" > 0 THEN 1 ELSE 0 END)::double precision
          / NULLIF(COUNT(*)::double precision, 0)
        ) AS y
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
        ${pSql}
        ${minSql}
        ${maxSql}
        AND d."betAmount" >= 0
        AND d."betAmount" < ${SCATTER_LOW_CEIL}
      GROUP BY WIDTH_BUCKET(
        d."betAmount"::numeric,
        0,
        ${SCATTER_LOW_CEIL},
        ${SCATTER_LOW_BUCKETS}
      )
      HAVING COUNT(*) > 0
      ORDER BY 1 ASC NULLS LAST
    `);

    const highRows = await this.prisma.$queryRaw<Pt[]>(Prisma.sql`
      SELECT
        AVG(d."betAmount"::double precision) AS x,
        (
          100.0 * SUM(CASE WHEN d."profit" > 0 THEN 1 ELSE 0 END)::double precision
          / NULLIF(COUNT(*)::double precision, 0)
        ) AS y
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
        ${pSql}
        ${minSql}
        ${maxSql}
        AND d."betAmount" >= ${SCATTER_LOW_CEIL}
        AND d."betAmount" <= ${SCATTER_HIGH_CAP}
      GROUP BY WIDTH_BUCKET(
        d."betAmount"::numeric,
        ${SCATTER_LOW_CEIL},
        ${SCATTER_HIGH_CAP},
        ${SCATTER_HIGH_BUCKETS}
      )
      HAVING COUNT(*) > 0
      ORDER BY 1 ASC NULLS LAST
    `);

    return {
      low: scatterPointsFromRows(lowRows),
      high: scatterPointsFromRows(highRows),
    };
  }

  async aggregateRiskPosture(
    fromInclusive: Date,
    toExclusive: Date,
  ): Promise<DiceRiskPostureRow> {
    type RiskCnt = {
      low_n: bigint | number | null;
      med_n: bigint | number | null;
      hi_n: bigint | number | null;
    };
    const riskRows = await this.prisma.$queryRaw<RiskCnt[]>(Prisma.sql`
      WITH ua AS (
        SELECT
          d."userUsername",
          AVG(d."chance"::numeric) AS avg_c
        FROM "DiceBet" d
        WHERE d."createdAt" >= ${fromInclusive}
          AND d."createdAt" < ${toExclusive}
        GROUP BY 1
      )
      SELECT
        COUNT(*) FILTER (WHERE ua.avg_c >= 50)::bigint AS low_n,
        COUNT(*) FILTER (WHERE ua.avg_c >= 30 AND ua.avg_c < 50)::bigint AS med_n,
        COUNT(*) FILTER (WHERE ua.avg_c < 30)::bigint AS hi_n
      FROM ua
    `);
    const rc = riskRows[0];
    const riskCounts = {
      low: toInt(rc?.low_n),
      medium: toInt(rc?.med_n),
      high: toInt(rc?.hi_n),
    };

    type Agg = {
      sb: number;
      w_low: bigint | number | null;
      t_low: bigint | number | null;
      w_hi: bigint | number | null;
      t_hi: bigint | number | null;
    };
    const aggRows = await this.prisma.$queryRaw<Agg[]>(Prisma.sql`
      WITH ua AS (
        SELECT
          d."userUsername",
          AVG(d."chance"::numeric) AS avg_c
        FROM "DiceBet" d
        WHERE d."createdAt" >= ${fromInclusive}
          AND d."createdAt" < ${toExclusive}
        GROUP BY 1
      ),
      enriched AS (
        SELECT
          CASE
            WHEN d."betAmount" < 50 THEN 0
            WHEN d."betAmount" < 150 THEN 1
            WHEN d."betAmount" < 400 THEN 2
            ELSE 3
          END AS sb,
          ua.avg_c,
          (d."profit" > 0) AS won
        FROM "DiceBet" d
        INNER JOIN ua ON ua."userUsername" = d."userUsername"
        WHERE d."createdAt" >= ${fromInclusive}
          AND d."createdAt" < ${toExclusive}
      )
      SELECT
        sb,
        SUM(CASE WHEN avg_c >= 50 AND won THEN 1 ELSE 0 END)::bigint AS w_low,
        SUM(CASE WHEN avg_c >= 50 THEN 1 ELSE 0 END)::bigint AS t_low,
        SUM(CASE WHEN avg_c < 35 AND won THEN 1 ELSE 0 END)::bigint AS w_hi,
        SUM(CASE WHEN avg_c < 35 THEN 1 ELSE 0 END)::bigint AS t_hi
      FROM enriched
      GROUP BY sb
      ORDER BY sb ASC
    `);

    const winLow = [0, 0, 0, 0];
    const winHigh = [0, 0, 0, 0];
    for (const row of aggRows) {
      const i = Number(row.sb);
      if (i < 0 || i > 3) continue;
      const tl = toInt(row.t_low);
      const th = toInt(row.t_hi);
      winLow[i] =
        tl > 0 ? Math.round((toInt(row.w_low) * 10_000) / tl) / 100 : 0;
      winHigh[i] =
        th > 0 ? Math.round((toInt(row.w_hi) * 10_000) / th) / 100 : 0;
    }

    type MRow = { m: number | null };
    const mulRows = await this.prisma.$queryRaw<MRow[]>(Prisma.sql`
      SELECT
        COALESCE(
          AVG(d."multiplier"::double precision) FILTER (WHERE d."profit" > 0),
          0
        ) AS m
      FROM "DiceBet" d
      WHERE d."createdAt" >= ${fromInclusive}
        AND d."createdAt" < ${toExclusive}
    `);
    const avgWinMultiplier = Number(mulRows[0]?.m ?? 0);

    return {
      riskCounts,
      winRateByStake: { low: winLow, high: winHigh },
      avgWinMultiplier,
    };
  }

  async listDicePlayersAggregates(
    filter: DicePlayersListFilter,
  ): Promise<{ rows: DicePlayerAggregateDbRow[]; total: number }> {
    const userSql = filter.username?.trim()
      ? Prisma.sql`AND d."userUsername" ILIKE ${'%' + escapeIlike(filter.username!.trim()) + '%'} ESCAPE '\\'`
      : Prisma.empty;
    const modStatusSql = dicePlayersModerationStatusWhereSql(
      filter.moderationStatus,
    );

    type CountRow = { c: bigint | number | null };
    const countRows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS c
      FROM (
        SELECT
          d."userUsername" AS username,
          MAX(mpc."status"::text) AS mod_status
        FROM "DiceBet" d
        LEFT JOIN "DicePlayerControl" mpc ON mpc."userUsername" = d."userUsername"
        WHERE 1 = 1
          ${userSql}
        GROUP BY d."userUsername"
      ) agg
      WHERE 1 = 1
        ${modStatusSql}
    `);
    const total = toInt(countRows[0]?.c);

    type AggSql = {
      username: string;
      rolls: bigint | number | null;
      wagered: string | number | null;
      wins: bigint | number | null;
      profit_loss: string | number | null;
      avg_chance: string | number | null;
      bet_stddev: string | number | null;
      bet_mean: string | number | null;
      mod_status: string | null;
      mod_max_bet: string | number | null;
    };

    const limit = Math.max(1, filter.limit);
    const offset = Math.max(0, filter.offset);
    const orderSql = dicePlayersOrderBySql(
      filter.sort ?? 'rolls',
      filter.order ?? 'desc',
    );

    const rows = await this.prisma.$queryRaw<AggSql[]>(Prisma.sql`
      SELECT * FROM (
        SELECT
          d."userUsername" AS username,
          COUNT(*)::bigint AS rolls,
          COALESCE(SUM(d."betAmount"), 0)::double precision AS wagered,
          SUM(CASE WHEN d."profit" > 0 THEN 1 ELSE 0 END)::bigint AS wins,
          COALESCE(SUM(d."profit"), 0)::double precision AS profit_loss,
          AVG(d."chance"::numeric)::double precision AS avg_chance,
          STDDEV_POP(d."betAmount"::numeric)::double precision AS bet_stddev,
          AVG(d."betAmount"::numeric)::double precision AS bet_mean,
          MAX(mpc."status"::text) AS mod_status,
          MAX(mpc."maxBetAmount"::double precision) AS mod_max_bet
        FROM "DiceBet" d
        LEFT JOIN "DicePlayerControl" mpc ON mpc."userUsername" = d."userUsername"
        WHERE 1 = 1
          ${userSql}
        GROUP BY d."userUsername"
      ) agg
      WHERE 1 = 1
        ${modStatusSql}
      ${orderSql}
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return { rows: rows.map((r) => mapDicePlayerAggSqlRow(r)), total };
  }

  async aggregateOneDicePlayer(
    username: string,
  ): Promise<DicePlayerAggregateDbRow | null> {
    type AggSql = {
      username: string;
      rolls: bigint | number | null;
      wagered: string | number | null;
      wins: bigint | number | null;
      profit_loss: string | number | null;
      avg_chance: string | number | null;
      bet_stddev: string | number | null;
      bet_mean: string | number | null;
      mod_status: string | null;
      mod_max_bet: string | number | null;
    };
    const rows = await this.prisma.$queryRaw<AggSql[]>(Prisma.sql`
      SELECT
        d."userUsername" AS username,
        COUNT(*)::bigint AS rolls,
        COALESCE(SUM(d."betAmount"), 0)::double precision AS wagered,
        SUM(CASE WHEN d."profit" > 0 THEN 1 ELSE 0 END)::bigint AS wins,
        COALESCE(SUM(d."profit"), 0)::double precision AS profit_loss,
        AVG(d."chance"::numeric)::double precision AS avg_chance,
        STDDEV_POP(d."betAmount"::numeric)::double precision AS bet_stddev,
        AVG(d."betAmount"::numeric)::double precision AS bet_mean,
        MAX(mpc."status"::text) AS mod_status,
        MAX(mpc."maxBetAmount"::double precision) AS mod_max_bet
      FROM "DiceBet" d
      LEFT JOIN "DicePlayerControl" mpc ON mpc."userUsername" = d."userUsername"
      WHERE d."userUsername" = ${username}
      GROUP BY d."userUsername"
    `);
    const r = rows[0];
    return r ? mapDicePlayerAggSqlRow(r) : null;
  }
}

function dicePlayersModerationStatusWhereSql(
  status: DicePlayersModerationFilter | undefined,
): Prisma.Sql {
  if (!status) return Prisma.empty;
  if (status === 'active') {
    return Prisma.sql`AND (agg.mod_status IS NULL)`;
  }
  if (status === 'limited') {
    return Prisma.sql`AND agg.mod_status = 'LIMITED'`;
  }
  return Prisma.sql`AND agg.mod_status = 'BANNED'`;
}

function mapDicePlayerAggSqlRow(r: {
  username: string;
  rolls: bigint | number | null;
  wagered: string | number | null;
  wins: bigint | number | null;
  profit_loss: string | number | null;
  avg_chance: string | number | null;
  bet_stddev: string | number | null;
  bet_mean: string | number | null;
  mod_status: string | null;
  mod_max_bet: string | number | null;
}): DicePlayerAggregateDbRow {
  return {
    username: r.username,
    rolls: toInt(r.rolls),
    wagered: Number(r.wagered ?? 0),
    wins: toInt(r.wins),
    profitLoss: Number(r.profit_loss ?? 0),
    avgChance: Number(r.avg_chance ?? 0),
    betStddev:
      r.bet_stddev != null && Number.isFinite(Number(r.bet_stddev))
        ? Number(r.bet_stddev)
        : null,
    betMean: Number(r.bet_mean ?? 0),
    moderationStatus: r.mod_status ?? null,
    moderationMaxBet:
      r.mod_max_bet != null && Number.isFinite(Number(r.mod_max_bet))
        ? Number(r.mod_max_bet)
        : null,
  };
}

function dicePlayersOrderBySql(
  sort: DicePlayersSortField,
  order: 'asc' | 'desc',
): Prisma.Sql {
  const asc = order === 'asc';
  switch (sort) {
    case 'username':
      return asc
        ? Prisma.sql`ORDER BY agg.username ASC`
        : Prisma.sql`ORDER BY agg.username DESC`;
    case 'wagered':
      return asc
        ? Prisma.sql`ORDER BY agg.wagered ASC`
        : Prisma.sql`ORDER BY agg.wagered DESC`;
    case 'profitLoss':
      return asc
        ? Prisma.sql`ORDER BY agg.profit_loss ASC`
        : Prisma.sql`ORDER BY agg.profit_loss DESC`;
    case 'winRate':
      return asc
        ? Prisma.sql`ORDER BY (agg.wins::double precision / NULLIF(agg.rolls::double precision, 0)) ASC NULLS LAST`
        : Prisma.sql`ORDER BY (agg.wins::double precision / NULLIF(agg.rolls::double precision, 0)) DESC NULLS LAST`;
    case 'risk':
      return asc
        ? Prisma.sql`ORDER BY agg.avg_chance DESC NULLS LAST`
        : Prisma.sql`ORDER BY agg.avg_chance ASC NULLS LAST`;
    case 'status':
      return asc
        ? Prisma.sql`ORDER BY agg.mod_status ASC NULLS FIRST`
        : Prisma.sql`ORDER BY agg.mod_status DESC NULLS LAST`;
    case 'rolls':
    default:
      return asc
        ? Prisma.sql`ORDER BY agg.rolls ASC`
        : Prisma.sql`ORDER BY agg.rolls DESC`;
  }
}

function dicePlayerFilterSql(player: string | undefined): Prisma.Sql {
  if (!player?.trim()) return Prisma.empty;
  const p = player.trim();
  if (isLikelyUuid(p)) {
    return Prisma.sql`AND d."userUsername" = (
      SELECT u."username" FROM "User" u WHERE u."id" = ${p}::uuid LIMIT 1
    )`;
  }
  const esc = escapeIlike(p);
  return Prisma.sql`AND d."userUsername" ILIKE ${'%' + esc + '%'} ESCAPE '\\'`;
}

function escapeIlike(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function scatterPointsFromRows(rows: { x: number | null; y: number | null }[]): [
  number,
  number,
][] {
  const out: [number, number][] = [];
  for (const row of rows) {
    const x = row.x != null ? Number(row.x) : NaN;
    const y = row.y != null ? Number(row.y) : NaN;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out.push([
      Math.round(x * 100) / 100,
      Math.round(y * 100) / 100,
    ]);
  }
  return out;
}

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function decimalToNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

function toInt(v: bigint | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'bigint') return Number(v);
  return Number(v);
}
