import { adminApiClientFetch } from "./client-fetch";

export type AdminUserModerationStatus = "ACTIVE" | "LIMITED" | "BANNED";

export type AdminUserLoginStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "NEVER_LOGGED_IN";

export type AdminUserChatBanInfo = {
  banned: boolean;
  permanent: boolean;
  expires_at: string | null;
  banned_at: string | null;
  banned_by: string | null;
  reason: string | null;
};

export function defaultChatBanInfo(): AdminUserChatBanInfo {
  return {
    banned: false,
    permanent: false,
    expires_at: null,
    banned_at: null,
    banned_by: null,
    reason: null,
  };
}

export type AdminUserRow = {
  id: string;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  balance: string;
  total_wagered: string;
  total_xp: number;
  current_level: number;
  role: string;
  status: AdminUserLoginStatus;
  moderation_status: AdminUserModerationStatus;
  created_at: string;
  last_login: string | null;
  last_login_ip: string | null;
  last_known_ip: string | null;
  last_user_agent: string | null;
  last_device: string | null;
  geo_country: string | null;
  geo_city: string | null;
  geo_timezone: string | null;
  last_active_at: string | null;
  login_count: number;
  ip_history: string[];
  device_history: string[];
  device_fingerprint: string | null;
  is_vpn: boolean | null;
  is_proxy: boolean | null;
  chat_ban?: AdminUserChatBanInfo;
};

export type AdminUsersListMeta = {
  currentPage: number;
  limit: number;
  totalUsers: number;
  totalPages: number;
};

export type AdminUsersListResponse = {
  data: AdminUserRow[];
  meta: AdminUsersListMeta;
};

export type AdminUsersListQuery = {
  email?: string;
  role?: string;
  status?: AdminUserLoginStatus;
  moderationStatus?: AdminUserModerationStatus | "all";
  page?: number;
  limit?: number;
  sort?: "balance" | "wager" | "created_at";
  order?: "asc" | "desc";
  activeWithinDays?: number;
};

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: unknown };
    if (Array.isArray(j.message)) {
      return j.message.filter((x) => typeof x === "string").join(", ");
    }
    if (typeof j.message === "string") return j.message;
  } catch {
    /* fall through */
  }
  return res.statusText || `Request failed (${res.status})`;
}

export async function fetchAdminUsersListApi(
  query?: AdminUsersListQuery,
  init?: RequestInit,
): Promise<AdminUsersListResponse> {
  const q = new URLSearchParams();
  const search = query?.email?.trim() ?? "";
  if (search.length > 0) q.set("email", search);
  if (query?.role) q.set("role", query.role);
  if (query?.status) q.set("status", query.status);
  if (
    query?.moderationStatus != null &&
    query.moderationStatus !== "all"
  ) {
    q.set("moderationStatus", query.moderationStatus);
  }
  if (query?.page != null && query.page > 0) q.set("page", String(query.page));
  if (query?.limit != null && query.limit > 0) {
    q.set("limit", String(query.limit));
  }
  if (query?.sort) q.set("sort", query.sort);
  if (query?.order) q.set("order", query.order);
  if (query?.activeWithinDays != null) {
    q.set("activeWithinDays", String(query.activeWithinDays));
  }
  const path =
    q.toString().length > 0 ? `/admin/users?${q}` : "/admin/users";
  const res = await adminApiClientFetch(path, init);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<AdminUsersListResponse>;
}

export async function fetchAdminUsersCountApi(
  query?: Omit<AdminUsersListQuery, "page" | "limit" | "sort" | "order">,
  init?: RequestInit,
): Promise<{ totalUsers: number }> {
  const q = new URLSearchParams();
  const search = query?.email?.trim() ?? "";
  if (search.length > 0) q.set("email", search);
  if (query?.role) q.set("role", query.role);
  if (query?.status) q.set("status", query.status);
  if (
    query?.moderationStatus != null &&
    query.moderationStatus !== "all"
  ) {
    q.set("moderationStatus", query.moderationStatus);
  }
  if (query?.activeWithinDays != null) {
    q.set("activeWithinDays", String(query.activeWithinDays));
  }
  const path =
    q.toString().length > 0
      ? `/admin/users/count?${q}`
      : "/admin/users/count";
  const res = await adminApiClientFetch(path, init);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{ totalUsers: number }>;
}

export type GlobalModerationAction = "BAN" | "UNBAN" | "LIMIT" | "UNLIMIT";

export async function postAdminUserGlobalModerationApi(
  username: string,
  body: {
    action: GlobalModerationAction;
    note?: string;
    maxBetAmount?: number;
    maxGamesPerHour?: number;
  },
  init?: RequestInit,
): Promise<{ ok: true }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/users/${enc}/moderation`, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{ ok: true }>;
}

export type PatchAdminGameUserBody = {
  balanceSet?: string;
  balanceDelta?: string;
  totalWageredSet?: string;
  totalWageredDelta?: string;
  role?: string;
  totalXP?: number;
  totalXPDelta?: number;
  currentLevel?: number;
};

export async function getAdminUserChatBanApi(
  userId: string,
  init?: RequestInit,
): Promise<{ user: { id: string; username: string }; chat_ban: AdminUserChatBanInfo }> {
  const enc = encodeURIComponent(userId);
  const res = await adminApiClientFetch(`/admin/users/${enc}/chat-ban`, init);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{
    user: { id: string; username: string };
    chat_ban: AdminUserChatBanInfo;
  }>;
}

export async function postAdminUserChatBanApi(
  userId: string,
  body: { reason: string; durationMinutes?: number | null },
  init?: RequestInit,
): Promise<{ user: { id: string; username: string }; chat_ban: AdminUserChatBanInfo }> {
  const enc = encodeURIComponent(userId);
  const res = await adminApiClientFetch(`/admin/users/${enc}/chat-ban`, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{
    user: { id: string; username: string };
    chat_ban: AdminUserChatBanInfo;
  }>;
}

export async function postAdminUserChatUnbanApi(
  userId: string,
  init?: RequestInit,
): Promise<{ user: { id: string; username: string }; chat_ban: AdminUserChatBanInfo }> {
  const enc = encodeURIComponent(userId);
  const res = await adminApiClientFetch(`/admin/users/${enc}/chat-unban`, {
    ...init,
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{
    user: { id: string; username: string };
    chat_ban: AdminUserChatBanInfo;
  }>;
}

export async function patchAdminGameUserApi(
  username: string,
  body: PatchAdminGameUserBody,
  init?: RequestInit,
): Promise<{ ok: true; user: AdminUserRow }> {
  const enc = encodeURIComponent(username);
  const res = await adminApiClientFetch(`/admin/users/${enc}`, {
    ...init,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<{ ok: true; user: AdminUserRow }>;
}
