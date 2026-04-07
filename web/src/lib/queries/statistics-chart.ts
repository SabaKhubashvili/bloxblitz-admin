import { adminApiClientFetch } from "@/lib/admin-api/client-fetch";

export type StatisticsChartGranularity = "hour" | "day" | "month";

export type StatisticsChartDatum = {
  date: string;
  totalWagered: string;
  totalPaidOut: string;
  totalUserLoss: string;
};

export type StatisticsChartResponse = {
  series: StatisticsChartDatum[];
  meta: {
    from: string;
    to: string;
    granularity: StatisticsChartGranularity;
    preset?: string;
    appliedFilters: Record<string, unknown>;
  };
};

export type StatisticsChartPreset = "24h" | "7d" | "30d" | "1y";

export type StatisticsChartFetchParams =
  | { kind: "preset"; preset: StatisticsChartPreset }
  | { kind: "custom"; startDate: string; endDate: string };

function buildQueryString(params: StatisticsChartFetchParams): string {
  const qs = new URLSearchParams();
  if (params.kind === "preset") {
    qs.set("preset", params.preset);
  } else {
    qs.set("startDate", params.startDate);
    qs.set("endDate", params.endDate);
  }
  return qs.toString();
}

function statisticsChartQueryKey(params: StatisticsChartFetchParams) {
  return ["admin", "analytics", "statistics-chart", params] as const;
}

export async function fetchStatisticsChart(
  params: StatisticsChartFetchParams,
): Promise<StatisticsChartResponse> {
  const qs = buildQueryString(params);
  const res = await adminApiClientFetch(
    `/admin/analytics/wagering/statistics-chart?${qs}`,
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      typeof err.message === "string" ? err.message : "Failed to load chart data",
    );
  }
  const data = (await res.json()) as unknown;
  if (!isStatisticsChartResponse(data)) {
    throw new Error("Invalid statistics chart response");
  }
  return data;
}

function isStatisticsChartResponse(
  data: unknown,
): data is StatisticsChartResponse {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.series) || typeof o.meta !== "object" || !o.meta) {
    return false;
  }
  const meta = o.meta as Record<string, unknown>;
  if (typeof meta.from !== "string" || typeof meta.granularity !== "string") {
    return false;
  }
  return o.series.every(
    (row) =>
      row &&
      typeof row === "object" &&
      typeof (row as StatisticsChartDatum).date === "string" &&
      typeof (row as StatisticsChartDatum).totalWagered === "string" &&
      typeof (row as StatisticsChartDatum).totalPaidOut === "string" &&
      typeof (row as StatisticsChartDatum).totalUserLoss === "string",
  );
}

export { statisticsChartQueryKey };
