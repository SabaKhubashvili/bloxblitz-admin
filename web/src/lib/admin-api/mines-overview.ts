import { adminApiClientFetch } from "./client-fetch";
import type { TimeRange } from "@/app/(admin)/admin/mines/mock/types";

export type MinesOverviewChartPoint = { x: string; y: number };

export type MinesOverviewResponse = {
  stats: {
    totalGamesPlayed: number;
    totalWagered: number;
    totalProfitLoss: number;
    activePlayers: number;
    avgCashoutMultiplier: number;
  };
  charts: {
    gamesPlayed: MinesOverviewChartPoint[];
    profitLoss: MinesOverviewChartPoint[];
    avgMultiplier: MinesOverviewChartPoint[];
  };
};

export async function fetchMinesOverviewApi(
  range: TimeRange,
  init?: RequestInit,
): Promise<MinesOverviewResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(
    `/admin/mines/overview?${q}`,
    init,
  );
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
  return res.json() as Promise<MinesOverviewResponse>;
}
