/**
 * Client-side calls to admin-api via same-origin proxy (cookie sent automatically).
 * Paths must be allowlisted in `app/api/admin-proxy/[...path]/route.ts`.
 */
export async function adminApiClientFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return fetch(`/api/admin-proxy${normalized}`, {
    ...init,
    credentials: "include",
  });
}
