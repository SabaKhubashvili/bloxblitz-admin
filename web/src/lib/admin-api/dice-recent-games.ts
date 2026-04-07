import { adminApiClientFetch } from "./client-fetch";

export type DiceRecentGamesSide = "over" | "under";

export type DiceRecentGameApi = {
  id: string;
  player: string;
  betAmount: number;
  payout: number;
  profit: number;
  roll: number;
  target: number;
  side: DiceRecentGamesSide;
  createdAt: string;
};

export type DiceRecentGamesApiResponse = {
  games: DiceRecentGameApi[];
};

export type FetchDiceRecentGamesParams = {
  player?: string;
  minBet?: number;
  side?: DiceRecentGamesSide;
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

function buildQuery(params: FetchDiceRecentGamesParams): string {
  const q = new URLSearchParams();
  if (params.player !== undefined && params.player !== "") {
    q.set("player", params.player);
  }
  if (
    params.minBet !== undefined &&
    !Number.isNaN(params.minBet) &&
    params.minBet >= 0
  ) {
    q.set("minBet", String(params.minBet));
  }
  if (params.side !== undefined) {
    q.set("side", params.side);
  }
  const s = q.toString();
  return s.length ? `?${s}` : "";
}

export async function fetchDiceRecentGames(
  params: FetchDiceRecentGamesParams,
  init?: RequestInit,
): Promise<DiceRecentGamesApiResponse> {
  const qs = buildQuery(params);
  const res = await adminApiClientFetch(
    `/admin/dice/recent-games${qs}`,
    init,
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<DiceRecentGamesApiResponse>;
}
