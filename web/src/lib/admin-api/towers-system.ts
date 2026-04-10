import { adminApiClientFetch } from "./client-fetch";

export type TowersSystemMode = "ACTIVE" | "NEW_GAMES_DISABLED" | "PAUSED";

export type TowersSystemStateApi = {
  mode: TowersSystemMode;
};

export async function fetchTowersSystemStateApi(
  init?: RequestInit,
): Promise<TowersSystemStateApi> {
  const res = await adminApiClientFetch("/admin/towers/system-state", init);
  if (!res.ok) {
    throw new Error(`System state load failed (${res.status})`);
  }
  return res.json() as Promise<TowersSystemStateApi>;
}

export async function saveTowersSystemStateApi(
  mode: TowersSystemMode,
  init?: RequestInit,
): Promise<TowersSystemStateApi> {
  const res = await adminApiClientFetch("/admin/towers/system-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
    ...init,
  });
  if (!res.ok) {
    throw new Error(`System state save failed (${res.status})`);
  }
  return res.json() as Promise<TowersSystemStateApi>;
}
