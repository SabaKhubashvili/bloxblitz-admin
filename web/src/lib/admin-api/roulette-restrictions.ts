import { adminApiClientFetch } from "./client-fetch";

export type RestrictionTimeframe = "HOURLY" | "DAILY" | "WEEKLY";

export type RouletteRestrictionInfo = {
  isBanned: boolean;
  banReason: string | null;
  maxWagerAmount: number | null;
  timeframe: RestrictionTimeframe | null;
};

export type RouletteRestrictionResponse = {
  username: string;
  restriction: RouletteRestrictionInfo | null;
};

export type SetRouletteRestrictionBody = {
  isBanned: boolean;
  banReason: string | null;
  maxWagerAmount: number | null;
  timeframe: RestrictionTimeframe | null;
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

function encSeg(s: string): string {
  return encodeURIComponent(s);
}

export async function fetchRouletteRestriction(
  username: string,
  signal?: AbortSignal,
): Promise<RouletteRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/roulette/restrictions/${encSeg(username)}`,
    { signal },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RouletteRestrictionResponse>;
}

export async function setRouletteRestriction(
  username: string,
  body: SetRouletteRestrictionBody,
): Promise<RouletteRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/roulette/restrictions/${encSeg(username)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RouletteRestrictionResponse>;
}

export async function banRoulettePlayer(
  username: string,
  reason?: string,
): Promise<RouletteRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/roulette/restrictions/${encSeg(username)}/ban`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason?.trim() || undefined }),
    },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RouletteRestrictionResponse>;
}

export async function unbanRoulettePlayer(
  username: string,
): Promise<RouletteRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/roulette/restrictions/${encSeg(username)}/unban`,
    { method: "POST" },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RouletteRestrictionResponse>;
}

export async function deleteRouletteRestriction(
  username: string,
): Promise<void> {
  const res = await adminApiClientFetch(
    `/admin/roulette/restrictions/${encSeg(username)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}
