import { adminApiClientFetch } from "./client-fetch";

export type RoulettePlayersSortField = "wagered" | "profit" | "games";

export type RoulettePlayerRow = {
  username: string;
  games: number;
  wagered: number;
  userProfit: number;
};

export type RoulettePlayersResponse = {
  players: RoulettePlayerRow[];
  total: number;
  page: number;
  limit: number;
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

export async function fetchRoulettePlayers(params: {
  page?: number;
  limit?: number;
  sort?: RoulettePlayersSortField;
  order?: "asc" | "desc";
  username?: string;
  signal?: AbortSignal;
}): Promise<RoulettePlayersResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  if (params.username?.trim()) q.set("username", params.username.trim());
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await adminApiClientFetch(
    `/admin/roulette/players${suffix}`,
    { signal: params.signal },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RoulettePlayersResponse>;
}
