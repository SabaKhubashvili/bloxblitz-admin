import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getAdminApiBaseUrl } from "./base-url";

/**
 * Authenticated fetch to admin-api from Server Components / Server Actions.
 * Sends Bearer token from the HttpOnly session cookie.
 */
export async function adminApiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error("Not authenticated");
  }
  const url = `${getAdminApiBaseUrl()}${normalized}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}
