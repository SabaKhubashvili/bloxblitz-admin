import { adminApiClientFetch } from "./client-fetch";

export type TowersPlayerRow = {
  username: string;
  totalGamesPlayed: number;
  totalWagered: number;
  netProfitLoss: number;
  avgMultiplier: number;
};

export type TowersPlayersResponse = {
  players: TowersPlayerRow[];
  total: number;
  page: number;
  limit: number;
};

export type TowersPlayerDetailResponse = {
  username: string;
  totalGamesPlayed: number;
  totalWagered: number;
  netProfitLoss: number;
  avgMultiplier: number;
  recentGames: {
    id: string;
    betAmount: number;
    profit: number;
    multiplier: number;
    outcome: string;
    createdAt: string;
  }[];
};

export async function fetchTowersPlayersApi(
  search: string | undefined,
  page: number,
  limit: number,
  init?: RequestInit,
): Promise<TowersPlayersResponse> {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search && search.trim()) q.set("search", search.trim());
  const res = await adminApiClientFetch(`/admin/towers/players?${q}`, init);
  if (!res.ok) {
    throw new Error(`Players load failed (${res.status})`);
  }
  return res.json() as Promise<TowersPlayersResponse>;
}

export async function fetchTowersPlayerDetailApi(
  username: string,
  init?: RequestInit,
): Promise<TowersPlayerDetailResponse> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/towers/players/${enc}`, init);
  if (!res.ok) {
    throw new Error(`Player detail failed (${res.status})`);
  }
  return res.json() as Promise<TowersPlayerDetailResponse>;
}
