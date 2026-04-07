import { adminApiClientFetch } from "./client-fetch";
import type { TimeRange } from "@/app/(admin)/admin/cases/mock/types";

export type CaseAnalyticsOverview = {
  totalOpened: number;
  revenue: number;
  avgRtp: number;
};

export type CaseMostWonItem = {
  name: string;
  dropCount: number;
};

export type CaseOpenRatePoint = {
  date: string;
  openCount: number;
};

export type CaseDropDistributionItem = {
  itemName: string;
  dropCount: number;
  percentage: number;
};

export type CaseAnalyticsResponse = {
  range: TimeRange;
  caseId: string;
  overview: CaseAnalyticsOverview;
  mostWonItems: CaseMostWonItem[];
  openRateOverTime: CaseOpenRatePoint[];
  itemDropDistribution: CaseDropDistributionItem[];
};

export async function fetchCaseAnalytics(
  caseId: string,
  params: { range?: TimeRange; limit?: number } = {}
): Promise<CaseAnalyticsResponse> {
  const q = new URLSearchParams();
  if (params.range) q.set("range", params.range);
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  const path = qs
    ? `/admin/cases/${encodeURIComponent(caseId)}/analytics?${qs}`
    : `/admin/cases/${encodeURIComponent(caseId)}/analytics`;
  const res = await adminApiClientFetch(path);
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (typeof body.message === "string") message = body.message;
    } catch {
      try {
        message = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<CaseAnalyticsResponse>;
}
