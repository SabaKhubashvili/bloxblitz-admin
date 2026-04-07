import { adminApiClientFetch } from "@/lib/admin-api/client-fetch";

export async function fetchAdminUsersCount(): Promise<number> {
  const res = await adminApiClientFetch("/admin/users/count");
  if (!res.ok) {
    throw new Error("Failed to load user count");
  }
  const data = (await res.json()) as { totalUsers?: number };
  if (typeof data.totalUsers !== "number") {
    throw new Error("Invalid user count response");
  }
  return data.totalUsers;
}

export const adminUsersCountQueryKey = ["admin", "users", "count"] as const;
