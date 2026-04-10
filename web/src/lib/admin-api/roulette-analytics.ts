import { adminApiClientFetch } from "./client-fetch";

export type RouletteAnalyticsRange = "24h" | "7d" | "30d";

export type RouletteAnalyticsApiResponse = {
  range: RouletteAnalyticsRange;
  metrics: {
    totalGames: number;
    totalWagered: number;
    profit: number;
    activePlayers: number;
  };
  charts: {
    gamesPlayedOverTime: Array<{ timestamp: string; count: number }>;
    profitOverTime: Array<{
      timestamp: string;
      profit: number;
      loss: number;
    }>;
    outcomeDistribution: Array<{ outcome: string; count: number }>;
  };
};

async function readErrorMessage(res: Response): Promise<string> {
  let message = res.statusText;
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(body.message)) message = body.message.join(", ");
    else if (typeof body.message === "string") message = body.message;
    else if (typeof body.error === "string" && body.error.length > 0) {
      message = body.message ? String(body.message) : body.error;
    }
  } catch {
    try {
      message = await res.text();
    } catch {
      /* ignore */
    }
  }
  return message || `Request failed (${res.status})`;
}

export async function fetchRouletteAnalytics(
  range: RouletteAnalyticsRange,
  init?: RequestInit,
): Promise<RouletteAnalyticsApiResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(
    `/admin/roulette/analytics?${q.toString()}`,
    init,
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RouletteAnalyticsApiResponse>;
}
