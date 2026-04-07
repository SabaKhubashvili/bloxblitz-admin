import { adminApiClientFetch } from "@/lib/admin-api/client-fetch";

/** Matches admin-api `GET /admin/analytics/wagering?range=24h` single-window payload. */
export type Wagering24hStatsResponse = {
  window: "last24Hours";
  stats: {
    from: string;
    to: string;
    totalWagered: string;
    totalPaidOut: string;
    houseProfit: string;
    betCount?: number;
    netUserLossPerBet?: string;
  };
  appliedFilters: Record<string, unknown>;
};

export type MonthlyGgrChartBucket = {
  month: string;
  totalWagered: string;
  totalPaidOut: string;
  houseProfit: string;
  ggr: string;
  betCount: number;
  netUserLossPerBet: string;
};

export type MonthlyGgrChartResponse = {
  series: MonthlyGgrChartBucket[];
  meta: {
    from: string;
    to: string;
    timeZone: string;
    monthsRequested: number;
    appliedFilters: Record<string, unknown>;
  };
};

export async function fetchWagering24h(): Promise<Wagering24hStatsResponse> {
  const qs = new URLSearchParams({ range: "24h" });
  const res = await adminApiClientFetch(
    `/admin/analytics/wagering?${qs.toString()}`,
  );
  if (!res.ok) {
    throw new Error("Failed to load wagering stats");
  }
  const data = (await res.json()) as unknown;
  if (!isWagering24hStatsResponse(data)) {
    throw new Error("Invalid wagering stats response");
  }
  return data;
}

function isWagering24hStatsResponse(
  data: unknown,
): data is Wagering24hStatsResponse {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.window !== "last24Hours" || typeof o.stats !== "object" || !o.stats) {
    return false;
  }
  const s = o.stats as Record<string, unknown>;
  return typeof s.totalWagered === "string";
}

export const wagering24hQueryKey = ["admin", "analytics", "wagering", "24h"] as const;

export const monthlyGgrChartQueryKey = [
  "admin",
  "analytics",
  "wagering",
  "monthly-ggr-chart",
] as const;

export async function fetchMonthlyGgrChart(
  months = 12,
): Promise<MonthlyGgrChartResponse> {
  const qs = new URLSearchParams({ months: String(months), timeZone: "UTC" });
  const res = await adminApiClientFetch(
    `/admin/analytics/wagering/monthly-ggr-chart?${qs.toString()}`,
  );
  if (!res.ok) {
    throw new Error("Failed to load monthly GGR");
  }
  const data = (await res.json()) as unknown;
  if (!isMonthlyGgrChartResponse(data)) {
    throw new Error("Invalid monthly GGR response");
  }
  return data;
}

function isMonthlyGgrChartResponse(
  data: unknown,
): data is MonthlyGgrChartResponse {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.series) || typeof o.meta !== "object" || !o.meta) {
    return false;
  }
  const meta = o.meta as Record<string, unknown>;
  if (typeof meta.timeZone !== "string" || typeof meta.from !== "string") {
    return false;
  }
  return o.series.every(
    (row) =>
      row &&
      typeof row === "object" &&
      typeof (row as MonthlyGgrChartBucket).month === "string" &&
      typeof (row as MonthlyGgrChartBucket).ggr === "string",
  );
}

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formats API decimal string as USD (compact for dashboard tiles). */
export function formatTotalStakeUsd(totalWagered: string): string {
  const n = Number(totalWagered);
  if (!Number.isFinite(n)) return "—";
  return compactUsd.format(n);
}
