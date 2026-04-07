import { adminApiClientFetch } from "./client-fetch";

export type DiceAnalyticsRange = "24h" | "7d" | "30d";

export type DiceAnalyticsApiResponse = {
  range: DiceAnalyticsRange;
  metrics: {
    totalRolls: number;
    totalWagered: number;
    profit: number;
    activePlayers: number;
  };
  charts: {
    rollDistribution: Array<{ value: number; count: number }>;
    profitOverTime: Array<{
      timestamp: string;
      profit: number;
      loss: number;
    }>;
    betDistribution: Array<{ range: string; count: number }>;
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

export async function fetchDiceAnalytics(
  range: DiceAnalyticsRange,
  init?: RequestInit,
): Promise<DiceAnalyticsApiResponse> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(
    `/admin/dice/analytics?${q.toString()}`,
    init,
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<DiceAnalyticsApiResponse>;
}
