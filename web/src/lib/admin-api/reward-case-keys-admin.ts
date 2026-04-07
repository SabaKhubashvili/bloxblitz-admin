import { adminApiClientFetch } from "./client-fetch";

export type UserKeyCaseRowApi = {
  rewardCaseId: string;
  slug: string;
  title: string;
  imageUrl: string;
  position: number;
  isActive: boolean;
  balance: number;
};

export type SetKeyBalanceResponse = {
  previousBalance: number;
  delta: number;
  balance: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** GET /admin/reward-case-keys?username=:username */
export async function fetchUserKeyBalances(
  username: string,
): Promise<UserKeyCaseRowApi[]> {
  const q = new URLSearchParams({ username });
  const res = await adminApiClientFetch(`/admin/reward-case-keys?${q}`);
  return parseJson<UserKeyCaseRowApi[]>(res);
}

/**
 * PATCH /admin/reward-case-keys
 * Provide `newBalance` (set exact) or `delta` (add/subtract).
 */
export async function setUserKeyBalance(body: {
  username: string;
  rewardCaseId: string;
  newBalance?: number;
  delta?: number;
  reason?: string;
}): Promise<SetKeyBalanceResponse> {
  const res = await adminApiClientFetch(`/admin/reward-case-keys`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<SetKeyBalanceResponse>(res);
}
