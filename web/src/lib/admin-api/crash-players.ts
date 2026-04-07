import { adminApiClientFetch } from "./client-fetch";

export type CrashPlayersRangePreset = "24h" | "7d" | "30d" | "custom";

export type CrashPlayersPublicStatus = "active" | "limited" | "banned";

export type CrashPlayersSortField =
  | "username"
  | "totalWagered"
  | "profitLoss"
  | "totalBets";

export type CrashPlayerListItem = {
  username: string;
  totalWagered: string;
  profitLoss: string;
  totalBets: number;
  status: CrashPlayersPublicStatus;
  limits: {
    maxBetAmount: string | null;
    minSecondsBetweenBets: number | null;
  } | null;
};

export type CrashPlayerListResponse = {
  items: CrashPlayerListItem[];
  total: number;
  page: number;
  limit: number;
};

export type CrashPlayersListParams = {
  range: CrashPlayersRangePreset;
  from?: string;
  to?: string;
  search?: string;
  status?: CrashPlayersPublicStatus;
  page?: number;
  limit?: number;
  sort?: CrashPlayersSortField;
  order?: "asc" | "desc";
};

function buildPlayersQuery(p: CrashPlayersListParams): string {
  const q = new URLSearchParams();
  q.set("range", p.range);
  if (p.range === "custom" && p.from && p.to) {
    q.set("from", p.from);
    q.set("to", p.to);
  }
  if (p.search?.trim()) q.set("search", p.search.trim());
  if (p.status) q.set("status", p.status);
  if (p.page != null) q.set("page", String(p.page));
  if (p.limit != null) q.set("limit", String(p.limit));
  if (p.sort) q.set("sort", p.sort);
  if (p.order) q.set("order", p.order);
  return q.toString();
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let msg = text || res.statusText || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { message?: string | string[] };
      if (j.message) {
        msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function fetchCrashPlayersList(
  params: CrashPlayersListParams,
): Promise<CrashPlayerListResponse> {
  const qs = buildPlayersQuery(params);
  const res = await adminApiClientFetch(`/admin/crash/players?${qs}`);
  return parseJsonOrThrow<CrashPlayerListResponse>(res);
}

export async function banCrashPlayer(
  username: string,
  body?: { note?: string },
): Promise<{ ok: true; alreadyBanned: boolean }> {
  const res = await adminApiClientFetch(
    `/admin/crash/players/${encodeURIComponent(username)}/ban`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  );
  return parseJsonOrThrow(res);
}

export async function limitCrashPlayer(
  username: string,
  body: {
    maxBetAmount?: number | null;
    minSecondsBetweenBets?: number | null;
    note?: string;
  },
): Promise<{ ok: true }> {
  const res = await adminApiClientFetch(
    `/admin/crash/players/${encodeURIComponent(username)}/limit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseJsonOrThrow(res);
}

export async function clearCrashPlayerRestrictions(
  username: string,
): Promise<{ ok: true; changed: boolean }> {
  const res = await adminApiClientFetch(
    `/admin/crash/players/${encodeURIComponent(username)}/clear-restrictions`,
    { method: "POST" },
  );
  return parseJsonOrThrow(res);
}
