import { adminApiClientFetch } from "./client-fetch";

export type RouletteRecentBetRow = {
  id: string;
  username: string;
  betAmount: number;
  profit: number | null;
  multiplier: number | null;
  status: string;
  createdAt: string;
};

export type RouletteRecentBetsResponse = {
  bets: RouletteRecentBetRow[];
};

async function readErrorMessage(res: Response): Promise<string> {
  let message = res.statusText;
  try {
    const body = (await res.json()) as {
      message?: string | string[];
    };
    if (Array.isArray(body.message)) message = body.message.join(", ");
    else if (typeof body.message === "string") message = body.message;
  } catch {
    try {
      message = await res.text();
    } catch {
      /* ignore */
    }
  }
  return message || `Request failed (${res.status})`;
}

export async function fetchRouletteRecentBets(params: {
  limit?: number;
  player?: string;
  signal?: AbortSignal;
}): Promise<RouletteRecentBetsResponse> {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.player?.trim()) q.set("player", params.player.trim());
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await adminApiClientFetch(
    `/admin/roulette/recent-bets${suffix}`,
    { signal: params.signal },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RouletteRecentBetsResponse>;
}
