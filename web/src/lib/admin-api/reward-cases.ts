import { adminApiClientFetch } from "./client-fetch";

export type RewardCasePrizeApi = {
  id: string;
  petId: number;
  weight: number;
  sortOrder: number;
  variant: string[];
  pet: { id: number; name: string; image: string; rarity: string };
};

export type RewardCaseSummaryApi = {
  id: string;
  slug: string;
  title: string;
  position: number;
  imageUrl: string;
  isRakebackCase: boolean;
  milestoneLevel: number | null;
  isActive: boolean;
  receivesWagerKeys: boolean;
  wagerCoinsPerKey: number;
  wagerKeysMaxPerEvent: number;
  levelUpKeysOverride: number | null;
  /** XP required per repeating milestone key. null = feature disabled. */
  xpMilestoneThreshold: number | null;
  /** Maximum keys granted per single XP-milestone event. */
  xpMilestoneMaxKeysPerEvent: number;
  /** Minimum user level required to unlock (open) this case. 0 = no restriction. */
  requiredLevel: number;
  createdAt: string;
  updatedAt: string;
  prizes: RewardCasePrizeApi[];
};

export type RewardCasesListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: RewardCaseSummaryApi[];
};

export type RewardCasePrizeOpenApi = {
  rewardCaseItemId?: string;
  petId?: number;
  name?: string;
  image?: string;
  rarity?: string;
  variant?: string[];
  value?: number;
};

export type RewardActivityItemApi = {
  id: string;
  eventType: "KEY_GRANT" | "CASE_OPEN";
  createdAt: string;
  userUsername: string;
  rewardTitle: string;
  rewardSlug: string;
  quantity: number | null;
  source: string | null;
  status: string;
  prizes: RewardCasePrizeOpenApi[] | null;
};

export type RewardActivityResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: RewardActivityItemApi[];
};

export type RewardOpenRowApi = {
  id: string;
  userUsername: string;
  createdAt: string;
  rewardCase: { id: string; title: string; slug: string };
  prizes: RewardCasePrizeOpenApi[];
};

export type RewardOpensResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: RewardOpenRowApi[];
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchRewardCasesList(
  params: {
    page: number;
    pageSize?: number;
    search?: string;
    status?: "all" | "active" | "inactive";
    sort?: string;
    order?: "asc" | "desc";
  },
  init?: RequestInit,
): Promise<RewardCasesListResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  const res = await adminApiClientFetch(`/admin/reward-cases?${q}`, init);
  return parseJson<RewardCasesListResponse>(res);
}

export async function fetchRewardCase(
  id: string,
  init?: RequestInit,
): Promise<RewardCaseSummaryApi> {
  const res = await adminApiClientFetch(
    `/admin/reward-cases/${encodeURIComponent(id)}`,
    init,
  );
  return parseJson<RewardCaseSummaryApi>(res);
}

export async function createRewardCase(
  body: Record<string, unknown>,
): Promise<RewardCaseSummaryApi> {
  const res = await adminApiClientFetch(`/admin/reward-cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<RewardCaseSummaryApi>(res);
}

export async function updateRewardCase(
  id: string,
  body: Record<string, unknown>,
): Promise<RewardCaseSummaryApi> {
  const res = await adminApiClientFetch(
    `/admin/reward-cases/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseJson<RewardCaseSummaryApi>(res);
}

export async function deleteRewardCase(id: string): Promise<{ ok: boolean }> {
  const res = await adminApiClientFetch(
    `/admin/reward-cases/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return parseJson<{ ok: boolean }>(res);
}

export async function addRewardCaseItem(
  caseId: string,
  body: {
    petId: number;
    weight: number;
    sortOrder?: number;
    variant?: string[];
  },
): Promise<unknown> {
  const res = await adminApiClientFetch(
    `/admin/reward-cases/${encodeURIComponent(caseId)}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseJson(res);
}

export async function updateRewardCaseItem(
  caseId: string,
  itemId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await adminApiClientFetch(
    `/admin/reward-cases/${encodeURIComponent(caseId)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseJson(res);
}

export async function deleteRewardCaseItem(
  caseId: string,
  itemId: string,
): Promise<{ ok: boolean }> {
  const res = await adminApiClientFetch(
    `/admin/reward-cases/${encodeURIComponent(caseId)}/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
  return parseJson<{ ok: boolean }>(res);
}

export async function fetchRewardActivity(
  params: {
    page: number;
    pageSize?: number;
    user?: string;
    rewardCaseId?: string;
    eventType?: "all" | "KEY_GRANT" | "CASE_OPEN";
    from?: string;
    to?: string;
    sort?: string;
    order?: "asc" | "desc";
  },
  init?: RequestInit,
): Promise<RewardActivityResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params.user?.trim()) q.set("user", params.user.trim());
  if (params.rewardCaseId) q.set("rewardCaseId", params.rewardCaseId);
  if (params.eventType && params.eventType !== "all")
    q.set("eventType", params.eventType);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  const res = await adminApiClientFetch(`/admin/reward-cases/activity?${q}`, init);
  return parseJson<RewardActivityResponse>(res);
}

export async function fetchRewardOpens(
  params: {
    page: number;
    pageSize?: number;
    user?: string;
    rewardCaseId?: string;
    from?: string;
    to?: string;
    sort?: string;
    order?: "asc" | "desc";
  },
  init?: RequestInit,
): Promise<RewardOpensResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params.user?.trim()) q.set("user", params.user.trim());
  if (params.rewardCaseId) q.set("rewardCaseId", params.rewardCaseId);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.sort) q.set("sort", params.sort);
  if (params.order) q.set("order", params.order);
  const res = await adminApiClientFetch(`/admin/reward-cases/opens?${q}`, init);
  return parseJson<RewardOpensResponse>(res);
}
