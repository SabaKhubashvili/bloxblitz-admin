import { adminApiClientFetch } from "./client-fetch";
import type { TimeRange } from "@/app/(admin)/admin/coinflip/mock/types";

export type CoinflipOverviewChartPoint = { x: string; y: number };

export type CoinflipOverviewResponse = {
  stats: {
    totalGames: number;
    totalWagered: number;
    platformProfit: number;
    activeGamesCount: number;
  };
  charts: {
    gamesCreated: CoinflipOverviewChartPoint[];
    wagerVolume: CoinflipOverviewChartPoint[];
    playerActivity: CoinflipOverviewChartPoint[];
  };
};

export async function fetchCoinflipOverview(
  range: TimeRange,
  init?: RequestInit,
): Promise<CoinflipOverviewResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(
    `/admin/coinflip/overview?${q}`,
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
  return res.json() as Promise<CoinflipOverviewResponse>;
}
