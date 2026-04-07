import { adminApiClientFetch } from "./client-fetch";

export type CoinflipActiveGamePlayer = {
  username: string;
  wager: number;
  side: "H" | "T";
  profilePicture?: string;
  level?: number;
  id?: string;
};

export type CoinflipActiveGameFairness = {
  serverSeedHash: string;
  nonce: string;
  serverSeed?: string;
  eosBlockNum?: number;
  eosBlockId?: string;
};

export type CoinflipActiveGame = {
  id: string;
  player1: CoinflipActiveGamePlayer;
  player2: CoinflipActiveGamePlayer | null;
  totalWager: number;
  state: "waiting" | "playing";
  createdAt: string;
  fairness?: CoinflipActiveGameFairness;
};

export type CoinflipActiveGamesResponse = {
  games: CoinflipActiveGame[];
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

export async function fetchCoinflipActiveGames(
  init?: RequestInit,
): Promise<CoinflipActiveGamesResponse> {
  const res = await adminApiClientFetch("/admin/coinflip/active-games", {
    ...init,
    method: "GET",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<CoinflipActiveGamesResponse>;
}

export async function cancelCoinflipGame(
  gameId: string,
  init?: RequestInit,
): Promise<{ ok: true; message: string }> {
  const res = await adminApiClientFetch("/admin/coinflip/cancel", {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<{ ok: true; message: string }>;
}
