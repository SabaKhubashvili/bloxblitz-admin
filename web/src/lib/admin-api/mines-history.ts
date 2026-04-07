import { adminApiClientFetch } from "./client-fetch";

export type MinesHistoryGame = {
  id: string;
  userId: string;
  betAmount: number;
  payout: number;
  multiplier: number;
  status: "cashed_out" | "lost";
  createdAt: string;
};

export type MinesHistoryResponse = {
  games: MinesHistoryGame[];
};

export async function fetchMinesHistoryApi(
  limit = 20,
  init?: RequestInit,
): Promise<MinesHistoryResponse> {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await adminApiClientFetch(
    `/admin/mines/history?${q}`,
    init,
  );
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
  return res.json() as Promise<MinesHistoryResponse>;
}
