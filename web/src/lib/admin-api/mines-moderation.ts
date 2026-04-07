import { adminApiClientFetch } from "./client-fetch";

export type MinesModerationUpsertBody = {
  status: "BANNED" | "LIMITED";
  maxBetAmount?: number | null;
  maxGamesPerHour?: number | null;
  note?: string | null;
};

export type MinesModerationItem = {
  userUsername: string;
  status: string;
  maxBetAmount: number | null;
  maxGamesPerHour: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
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

export async function upsertMinesModerationApi(
  username: string,
  body: MinesModerationUpsertBody,
  init?: RequestInit,
): Promise<{ item: MinesModerationItem }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/mines/moderation/${enc}`, {
    ...init,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{ item: MinesModerationItem }>;
}

export async function unbanMinesUserApi(
  username: string,
  init?: RequestInit,
): Promise<{ ok: true; changed: boolean }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(
    `/admin/mines/moderation/${enc}/unban`,
    { ...init, method: "POST" },
  );
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{ ok: true; changed: boolean }>;
}

export async function unlimitMinesUserApi(
  username: string,
  init?: RequestInit,
): Promise<{ ok: true; changed: boolean }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(
    `/admin/mines/moderation/${enc}/unlimit`,
    { ...init, method: "POST" },
  );
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{ ok: true; changed: boolean }>;
}
