import { adminApiClientFetch } from "./client-fetch";

export type TowersRestrictionInfo = {
  isBanned: boolean;
  banReason: string | null;
  dailyWagerLimit: number | null;
  weeklyWagerLimit: number | null;
  monthlyWagerLimit: number | null;
  limitReason: string | null;
};

export type TowersRestrictionResponse = {
  username: string;
  restriction: TowersRestrictionInfo | null;
};

export type SetTowersRestrictionBody = {
  isBanned: boolean;
  banReason: string | null;
  dailyWagerLimit: number | null;
  weeklyWagerLimit: number | null;
  monthlyWagerLimit: number | null;
  limitReason: string | null;
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

export async function fetchTowersRestriction(
  username: string,
  signal?: AbortSignal,
): Promise<TowersRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/towers/restrictions/${encSeg(username)}`,
    { signal },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<TowersRestrictionResponse>;
}

export async function setTowersRestriction(
  username: string,
  body: SetTowersRestrictionBody,
): Promise<TowersRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/towers/restrictions/${encSeg(username)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<TowersRestrictionResponse>;
}

export async function banTowersPlayer(
  username: string,
  reason?: string,
): Promise<TowersRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/towers/restrictions/${encSeg(username)}/ban`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason?.trim() || undefined }),
    },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<TowersRestrictionResponse>;
}

export async function unbanTowersPlayer(
  username: string,
): Promise<TowersRestrictionResponse> {
  const res = await adminApiClientFetch(
    `/admin/towers/restrictions/${encSeg(username)}/unban`,
    { method: "POST" },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<TowersRestrictionResponse>;
}

export async function deleteTowersRestriction(
  username: string,
): Promise<void> {
  const res = await adminApiClientFetch(
    `/admin/towers/restrictions/${encSeg(username)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}
