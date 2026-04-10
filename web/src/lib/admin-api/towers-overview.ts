import { adminApiClientFetch } from "./client-fetch";
import type { TowersTimeRange } from "@/app/(admin)/admin/towers/types";

export type TowersOverviewChartPoint = { x: string; y: number };

export type TowersOverviewResponse = {
  stats: {
    totalGamesPlayed: number;
    totalWagered: number;
    totalProfitLoss: number;
    activePlayers: number;
    avgCashoutMultiplier: number;
  };
  charts: {
    gamesPlayed: TowersOverviewChartPoint[];
    profitLoss: TowersOverviewChartPoint[];
    avgMultiplier: TowersOverviewChartPoint[];
  };
  chartNote?: string;
};

export async function fetchTowersOverviewApi(
  range: TowersTimeRange,
  init?: RequestInit,
): Promise<TowersOverviewResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(`/admin/towers/overview?${q}`, init);
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
  return res.json() as Promise<TowersOverviewResponse>;
}
