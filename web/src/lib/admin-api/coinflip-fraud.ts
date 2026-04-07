import { adminApiClientFetch } from "./client-fetch";

/** Mirrors admin-api fraud list payloads — do not reshape. */

export type CoinflipFraudSuspiciousUserItem = {
  username: string;
  riskScore: number;
  confidence: number;
  tier: string;
  games: number;
  winRate: number;
  reasons: string[];
};

export type CoinflipFraudSuspiciousUsersResponse = {
  items: CoinflipFraudSuspiciousUserItem[];
  total: number;
};

export type CoinflipFraudSuspiciousGameItem = {
  gameId: string;
  riskScore: number;
  reasons: string[];
};

export type CoinflipFraudSuspiciousGamesResponse = {
  items: CoinflipFraudSuspiciousGameItem[];
  total: number;
};

export type CoinflipFraudRiskProfileResponse = {
  username: string;
  riskScore: number;
  temporaryScore: number;
  persistentScore: number;
  confidence: number;
  tier: string;
  reasons: string[];
  stats: {
    games: number;
    wins: number;
    losses: number;
    winRate: number;
    wagered: number;
    payoutTotal: number;
    expWinShare: number;
    expectedNetCents: number;
    actualNetCents: number;
  };
  evRatio: number;
  topOpponents: { opponent: string; count: number }[];
  mitigation: Record<string, string> | null;
};

export type CoinflipFraudLimitPayload = {
  maxBetScaleBps?: number;
  maxBetCents?: number;
  matchmakingDelayMs?: number;
};

export type CoinflipFraudBanPayload = {
  reason: string;
  untilIso: string;
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

export type CoinflipFraudListParams = {
  minScore?: number;
  maxScore?: number;
  offset?: number;
  limit?: number;
};

function fraudListQs(params: CoinflipFraudListParams): string {
  const q = new URLSearchParams();
  if (params.minScore !== undefined) q.set("minScore", String(params.minScore));
  if (params.maxScore !== undefined) q.set("maxScore", String(params.maxScore));
  if (params.offset !== undefined) q.set("offset", String(params.offset));
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  const s = q.toString();
  return s.length ? `?${s}` : "";
}

export async function getSuspiciousUsers(
  params: CoinflipFraudListParams,
  init?: RequestInit,
): Promise<CoinflipFraudSuspiciousUsersResponse> {
  const res = await adminApiClientFetch(
    `/admin/coinflip/fraud/suspicious-users${fraudListQs(params)}`,
    {
      ...init,
      method: "GET",
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CoinflipFraudSuspiciousUsersResponse>;
}

export async function getSuspiciousGames(
  params: CoinflipFraudListParams,
  init?: RequestInit,
): Promise<CoinflipFraudSuspiciousGamesResponse> {
  const res = await adminApiClientFetch(
    `/admin/coinflip/fraud/suspicious-games${fraudListQs(params)}`,
    {
      ...init,
      method: "GET",
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CoinflipFraudSuspiciousGamesResponse>;
}

export async function getUserRiskProfile(
  username: string,
  init?: RequestInit,
): Promise<CoinflipFraudRiskProfileResponse> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(
    `/admin/coinflip/fraud/users/${enc}/risk-profile`,
    {
      ...init,
      method: "GET",
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CoinflipFraudRiskProfileResponse>;
}

export async function flagUser(
  username: string,
  reason: string,
  init?: RequestInit,
): Promise<{ ok: true; riskScore: number }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/coinflip/fraud/users/${enc}/flag`, {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify({ note: reason }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true; riskScore: number }>;
}

export async function limitUser(
  username: string,
  payload: CoinflipFraudLimitPayload,
  init?: RequestInit,
): Promise<{ ok: true }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/coinflip/fraud/users/${enc}/limit`, {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function banUser(
  username: string,
  payload: CoinflipFraudBanPayload,
  init?: RequestInit,
): Promise<{ ok: true }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/coinflip/fraud/users/${enc}/ban`, {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function clearUser(
  username: string,
  init?: RequestInit,
): Promise<{ ok: true }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/coinflip/fraud/users/${enc}/clear`, {
    ...init,
    method: "POST",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true }>;
}
