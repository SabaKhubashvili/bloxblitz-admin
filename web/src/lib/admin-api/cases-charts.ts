import type { TimeRange } from "@/app/(admin)/admin/cases/mock/types";
import { adminApiClientFetch } from "./client-fetch";

export type CasesChartDataset = {
  label: string;
  data: number[];
};

export type CasesChartApiResponse = {
  range: TimeRange;
  labels: string[];
  datasets: CasesChartDataset[];
};

export type PopularCaseApiEntry = {
  id: string;
  name: string;
  price: number;
  opens: number;
};

export type CasesPopularApiResponse = {
  range: TimeRange;
  cases: PopularCaseApiEntry[];
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCasesOpeningsChart(
  range: TimeRange,
): Promise<CasesChartApiResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(`/admin/cases/charts/openings?${q}`);
  return parseJson<CasesChartApiResponse>(res);
}

export async function fetchCasesRevenueChart(
  range: TimeRange,
): Promise<CasesChartApiResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(`/admin/cases/charts/revenue?${q}`);
  return parseJson<CasesChartApiResponse>(res);
}

export async function fetchCasesPopular(
  range: TimeRange,
): Promise<CasesPopularApiResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(`/admin/cases/charts/popular?${q}`);
  return parseJson<CasesPopularApiResponse>(res);
}
