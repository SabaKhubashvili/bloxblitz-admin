import { adminApiClientFetch } from "./client-fetch";

export type RecentCaseOpenItem = {
  id: string;
  username: string;
  caseName: string;
  itemWon: string;
  itemValue: number;
  openedAt: string;
};

export type RecentCaseOpensResponse = {
  opens: RecentCaseOpenItem[];
};

export async function fetchRecentCaseOpens(): Promise<RecentCaseOpensResponse> {
  const res = await adminApiClientFetch("/admin/cases/recent-opens");
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
  return res.json() as Promise<RecentCaseOpensResponse>;
}
