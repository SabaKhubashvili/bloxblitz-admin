import type {
  CasesOverviewStats,
  TimeRange,
} from "@/app/(admin)/admin/cases/mock/types";
import { adminApiClientFetch } from "./client-fetch";

export type { CasesOverviewStats };

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCasesOverviewStats(
  range: TimeRange,
): Promise<CasesOverviewStats> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(`/admin/cases/overview?${q}`);
  return parseJson<CasesOverviewStats>(res);
}
