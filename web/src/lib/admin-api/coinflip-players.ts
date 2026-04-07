import { adminApiClientFetch } from "./client-fetch";

export type CoinflipPlayerListItem = {
  userId: string;
  username: string;
  totalGames: number;
  totalWagered: string;
  wins: number;
  losses: number;
  winRate: number;
  profitLoss: string;
  status: "active" | "limited" | "banned";
  limits: {
    maxWagerAmount: string | null;
    maxGamesPerHour: number | null;
  } | null;
};

export type CoinflipPlayersListResponse = {
  items: CoinflipPlayerListItem[];
  total: number;
  page: number;
  limit: number;
};

export type CoinflipPlayersListParams = {
  page?: number;
  limit?: number;
  sort?:
    | "totalWagered"
    | "profitLoss"
    | "winRate"
    | "totalGames"
    | "username";
  order?: "asc" | "desc";
  userId?: string;
  username?: string;
  status?: "all" | "active" | "limited" | "banned";
};

export type CoinflipPlayerHistoryItem = {
  gameId: string;
  opponentUsername: string;
  wagerAmount: string;
  result: "win" | "loss";
  profitLoss: string;
  createdAt: string;
};

export type CoinflipPlayerHistoryResponse = {
  items: CoinflipPlayerHistoryItem[];
  total: number;
};

export type CoinflipPlayerStatusResponse = {
  username: string;
  status: "active" | "limited" | "banned";
  limits: {
    maxWagerAmount: string | null;
    maxGamesPerHour: number | null;
  } | null;
  note: string | null;
};

async function readErrorMessage(res: Response): Promise<string> {
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
  return message || `Request failed (${res.status})`;
}

function listQs(params: CoinflipPlayersListParams): string {
  const q = new URLSearchParams();
  if (params.page !== undefined) q.set("page", String(params.page));
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  if (params.sort !== undefined) q.set("sort", params.sort);
  if (params.order !== undefined) q.set("order", params.order);
  if (params.userId !== undefined && params.userId.trim())
    q.set("userId", params.userId.trim());
  if (params.username !== undefined && params.username.trim())
    q.set("username", params.username.trim());
  if (params.status !== undefined && params.status !== "all")
    q.set("status", params.status);
  const s = q.toString();
  return s.length ? `?${s}` : "";
}

export async function getCoinflipPlayers(
  params: CoinflipPlayersListParams,
  init?: RequestInit,
): Promise<CoinflipPlayersListResponse> {
  const res = await adminApiClientFetch(
    `/admin/coinflip/players${listQs(params)}`,
    {
      ...init,
      method: "GET",
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CoinflipPlayersListResponse>;
}

export async function getCoinflipPlayerHistory(
  username: string,
  params: { page?: number; limit?: number },
  init?: RequestInit,
): Promise<CoinflipPlayerHistoryResponse> {
  const enc = encodeURIComponent(username);
  const q = new URLSearchParams();
  if (params.page !== undefined) q.set("page", String(params.page));
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  const qs = q.toString();
  const res = await adminApiClientFetch(
    `/admin/coinflip/players/${enc}/history${qs ? `?${qs}` : ""}`,
    {
      ...init,
      method: "GET",
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CoinflipPlayerHistoryResponse>;
}

export async function getCoinflipPlayerStatus(
  username: string,
  init?: RequestInit,
): Promise<CoinflipPlayerStatusResponse> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(
    `/admin/coinflip/players/${enc}/status`,
    {
      ...init,
      method: "GET",
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CoinflipPlayerStatusResponse>;
}

export async function banCoinflipPlayer(
  username: string,
  body: { reason: string; untilIso: string },
  init?: RequestInit,
): Promise<{ ok: true; alreadyBanned: boolean }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/coinflip/players/${enc}/ban`, {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true; alreadyBanned: boolean }>;
}

export type CoinflipPlayerLimitBody = {
  maxWagerAmount?: number | null;
  maxGamesPerHour?: number | null;
  note?: string | null;
};

export async function limitCoinflipPlayer(
  username: string,
  body: CoinflipPlayerLimitBody,
  init?: RequestInit,
): Promise<{ ok: true }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/coinflip/players/${enc}/limit`, {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function clearCoinflipPlayerModeration(
  username: string,
  init?: RequestInit,
): Promise<{ ok: true; changed: boolean }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(
    `/admin/coinflip/players/${enc}/clear-moderation`,
    {
      ...init,
      method: "POST",
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true; changed: boolean }>;
}
