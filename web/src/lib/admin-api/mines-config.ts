import { adminApiClientFetch } from "./client-fetch";

export type MinesConfigResponse = {
  minBet: number;
  maxBet: number;
  houseEdge: number;
  rtpTarget: number;
};

export async function fetchMinesConfig(
  init?: RequestInit,
): Promise<MinesConfigResponse> {
  const res = await adminApiClientFetch("/admin/mines/config", init);
  if (!res.ok) {
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
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<MinesConfigResponse>;
}

export async function updateMinesConfig(
  body: MinesConfigResponse,
  init?: RequestInit,
): Promise<MinesConfigResponse> {
  const res = await adminApiClientFetch("/admin/mines/config", {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(j.message)) message = j.message.join(", ");
      else if (typeof j.message === "string") message = j.message;
    } catch {
      try {
        message = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<MinesConfigResponse>;
}
