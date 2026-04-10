import { adminApiClientFetch } from "./client-fetch";

export type TowersConfigApi = {
  minBet: number;
  maxBet: number;
  allowedDifficulties: string[];
  allowedLevels: number[];
};

export type TowersConfigBetsUpdate = Pick<TowersConfigApi, "minBet" | "maxBet">;

export async function fetchTowersConfigApi(
  init?: RequestInit,
): Promise<TowersConfigApi> {
  const res = await adminApiClientFetch("/admin/towers/config", init);
  if (!res.ok) {
    throw new Error(`Config load failed (${res.status})`);
  }
  return res.json() as Promise<TowersConfigApi>;
}

export async function saveTowersConfigApi(
  body: TowersConfigBetsUpdate,
  init?: RequestInit,
): Promise<TowersConfigApi> {
  const res = await adminApiClientFetch("/admin/towers/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(j.message)) message = j.message.join(", ");
      else if (typeof j.message === "string") message = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(message || `Save failed (${res.status})`);
  }
  return res.json() as Promise<TowersConfigApi>;
}
