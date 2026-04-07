import { adminApiClientFetch } from "./client-fetch";

export type MinesPlayerModerationStatus =
  | "ACTIVE"
  | "BANNED"
  | "LIMITED";

export type MinesPlayerRow = {
  id: string;
  username: string;
  totalGames: number;
  totalWins: number;
  totalWagered: number;
  avgTilesCleared: number;
  profitLoss: number;
  moderationStatus: MinesPlayerModerationStatus;
  maxBetAmount: number | null;
  maxGamesPerHour: number | null;
};

export type MinesPlayersResponse = {
  players: MinesPlayerRow[];
  total: number;
  page: number;
  limit: number;
};

export type MinesPlayersQuery = {
  search?: string;
  moderationStatus?: "all" | MinesPlayerModerationStatus;
  page?: number;
  limit?: number;
};

export type MinesPlayerRound = {
  id: string;
  username: string;
  betAmount: number;
  minesCount: number;
  tilesCleared: number;
  cashoutMultiplier: number;
  profitLoss: number;
  timestamp: string;
  gridSize: number;
  status: string;
  mineIndices: number[];
  revealedIndices: number[];
};

export type MinesPlayerHistoryResponse = {
  rounds: MinesPlayerRound[];
};

async function parseErrorMessage(res: Response): Promise<string> {
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

export async function fetchMinesPlayersApi(
  query?: MinesPlayersQuery,
  init?: RequestInit,
): Promise<MinesPlayersResponse> {
  const q = new URLSearchParams();
  const s = query?.search?.trim() ?? "";
  if (s.length > 0) q.set("search", s);
  if (
    query?.moderationStatus != null &&
    query.moderationStatus !== "all"
  ) {
    q.set("moderationStatus", query.moderationStatus);
  }
  if (query?.page != null && query.page > 0) q.set("page", String(query.page));
  if (query?.limit != null && query.limit > 0) {
    q.set("limit", String(query.limit));
  }
  const path =
    q.toString().length > 0
      ? `/admin/mines/players?${q}`
      : "/admin/mines/players";
  const res = await adminApiClientFetch(path, init);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<MinesPlayersResponse>;
}

export async function fetchMinesPlayerHistoryApi(
  username: string,
  init?: RequestInit,
): Promise<MinesPlayerHistoryResponse> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(
    `/admin/mines/players/${enc}/history`,
    init,
  );
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<MinesPlayerHistoryResponse>;
}
