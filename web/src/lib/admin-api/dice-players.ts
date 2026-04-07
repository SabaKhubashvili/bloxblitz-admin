import { adminApiAxios } from "./admin-axios";

export type DicePlayerStatusApi = "active" | "limited" | "banned";

export type DicePlayerStats = {
  username: string;
  rolls: number;
  wagered: number;
  winRate: number;
  profitLoss: number;
  risk: "low" | "medium" | "high";
  status: DicePlayerStatusApi;
  maxBet: number | null;
};

export type DicePlayersSortField =
  | "rolls"
  | "wagered"
  | "winRate"
  | "profitLoss"
  | "username"
  | "risk"
  | "status";

export type DicePlayersApiResponse = {
  players: DicePlayerStats[];
  total: number;
  page: number;
  limit: number;
};

export type FetchDicePlayersParams = {
  username?: string;
  page?: number;
  limit?: number;
  sort?: DicePlayersSortField;
  order?: "asc" | "desc";
  moderationStatus?: DicePlayerStatusApi;
};

function playerPathSegment(username: string): string {
  return encodeURIComponent(username);
}

export async function fetchDicePlayers(
  params: FetchDicePlayersParams = {},
): Promise<DicePlayersApiResponse> {
  const q = new URLSearchParams();
  if (params.username?.trim()) q.set("username", params.username.trim());
  if (params.page != null && params.page > 0) q.set("page", String(params.page));
  if (params.limit != null && params.limit > 0) {
    q.set("limit", String(params.limit));
  }
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  if (params.moderationStatus) {
    q.set("moderationStatus", params.moderationStatus);
  }
  const qs = q.toString();
  const { data } = await adminApiAxios.get<DicePlayersApiResponse>(
    `admin/dice/players${qs ? `?${qs}` : ""}`,
  );
  return data;
}

export async function banDicePlayer(
  username: string,
  body?: { reason?: string },
): Promise<DicePlayerStats> {
  const { data } = await adminApiAxios.post<DicePlayerStats>(
    `admin/dice/players/${playerPathSegment(username)}/ban`,
    body ?? {},
  );
  return data;
}

export async function unbanDicePlayer(username: string): Promise<DicePlayerStats> {
  const { data } = await adminApiAxios.post<DicePlayerStats>(
    `admin/dice/players/${playerPathSegment(username)}/unban`,
    {},
  );
  return data;
}

export async function limitDicePlayer(
  username: string,
  body: { maxBet: number; reason?: string },
): Promise<DicePlayerStats> {
  const { data } = await adminApiAxios.post<DicePlayerStats>(
    `admin/dice/players/${playerPathSegment(username)}/limit`,
    body,
  );
  return data;
}

export async function unlimitDicePlayer(username: string): Promise<DicePlayerStats> {
  const { data } = await adminApiAxios.post<DicePlayerStats>(
    `admin/dice/players/${playerPathSegment(username)}/unlimit`,
    {},
  );
  return data;
}
