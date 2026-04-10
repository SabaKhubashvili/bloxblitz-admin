import { adminApiClientFetch } from "./client-fetch";

export type CoinflipBotRow = {
  id: string;
  username: string;
  profile_picture: string;
  balance: string | number;
  currentLevel: number;
  botConfig: Record<string, unknown> | null;
  created_at: string;
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
  return message;
}

export async function fetchCoinflipBots(): Promise<CoinflipBotRow[]> {
  const res = await adminApiClientFetch("/admin/coinflip/bots");
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<CoinflipBotRow[]>;
}

export async function resyncCoinflipBotsRedis(): Promise<{ ok: true; count: number }> {
  const res = await adminApiClientFetch("/admin/coinflip/bots/resync", {
    method: "POST",
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true; count: number }>;
}

export type CreateCoinflipBotBody = {
  username: string;
  profilePicture?: string;
  initialBalance?: number;
  config?: Record<string, unknown>;
};

export async function createCoinflipBot(
  body: CreateCoinflipBotBody,
): Promise<{ ok: true }> {
  const res = await adminApiClientFetch("/admin/coinflip/bots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function updateCoinflipBot(
  username: string,
  body: { profilePicture?: string; config?: Record<string, unknown> },
): Promise<{ ok: true }> {
  const res = await adminApiClientFetch(
    `/admin/coinflip/bots/${encodeURIComponent(username)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true }>;
}

export async function deleteCoinflipBot(username: string): Promise<{ ok: true }> {
  const res = await adminApiClientFetch(
    `/admin/coinflip/bots/${encodeURIComponent(username)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<{ ok: true }>;
}
