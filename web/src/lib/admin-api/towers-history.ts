import { adminApiClientFetch } from "./client-fetch";

export type TowersHistoryRow = {
  id: string;
  userId: string;
  betAmount: number;
  profit: number;
  multiplier: number;
  outcome: "win" | "loss" | "cashout";
  difficulty: string | null;
  levels: number | null;
  towersDetailStatus: string | null;
  createdAt: string;
};

export type TowersHistoryResponse = {
  games: TowersHistoryRow[];
  total: number;
  page: number;
  limit: number;
};

export type TowersHistoryQuery = {
  page?: number;
  limit?: number;
  username?: string;
  outcome?: "all" | "won" | "lost" | "cashed_out";
  from?: string;
  to?: string;
};

export async function fetchTowersHistoryApi(
  query: TowersHistoryQuery,
  init?: RequestInit,
): Promise<TowersHistoryResponse> {
  const q = new URLSearchParams();
  if (query.page != null) q.set("page", String(query.page));
  if (query.limit != null) q.set("limit", String(query.limit));
  if (query.username) q.set("username", query.username);
  if (query.outcome && query.outcome !== "all") q.set("outcome", query.outcome);
  if (query.from) q.set("from", query.from);
  if (query.to) q.set("to", query.to);
  const suffix = q.toString() ? `?${q}` : "";
  const res = await adminApiClientFetch(`/admin/towers/history${suffix}`, init);
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
  return res.json() as Promise<TowersHistoryResponse>;
}
