import { adminApiClientFetch } from "./client-fetch";

export type CoinflipHistoryPlayer = {
  username: string;
  side: "H" | "T";
  wager: number;
};

export type CoinflipHistoryGame = {
  id: string;
  player1: CoinflipHistoryPlayer | null;
  player2: CoinflipHistoryPlayer | null;
  totalWager: number;
  state: "waiting" | "playing" | "finished";
  winner?: string;
  createdAt: string;
};

export type CoinflipHistoryResponse = {
  games: CoinflipHistoryGame[];
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

export async function fetchCoinflipHistory(
  params: { search?: string; minPot?: string },
  init?: RequestInit,
): Promise<CoinflipHistoryResponse> {
  const q = new URLSearchParams();
  const s = params.search?.trim();
  if (s) q.set("search", s);
  const mp = params.minPot?.trim();
  if (mp !== undefined && mp !== "") q.set("minPot", mp);

  const qs = q.toString();
  const path =
    qs.length > 0
      ? `/admin/coinflip/history?${qs}`
      : `/admin/coinflip/history`;

  const res = await adminApiClientFetch(path, {
    ...init,
    method: "GET",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<CoinflipHistoryResponse>;
}
