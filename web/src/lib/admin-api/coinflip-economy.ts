import { adminApiClientFetch } from "./client-fetch";

export type CoinflipEconomyConfig = {
  minBet: number;
  maxBet: number;
  platformFee: number;
  maxActiveGames: number;
  maxGamesPerUser: number;
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

export async function fetchCoinflipEconomy(
  init?: RequestInit,
): Promise<CoinflipEconomyConfig> {
  const res = await adminApiClientFetch("/admin/coinflip/economy", {
    ...init,
    method: "GET",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<CoinflipEconomyConfig>;
}

export async function updateCoinflipEconomy(
  patch: Partial<CoinflipEconomyConfig>,
  init?: RequestInit,
): Promise<CoinflipEconomyConfig> {
  const res = await adminApiClientFetch("/admin/coinflip/economy", {
    ...init,
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<CoinflipEconomyConfig>;
}
