/**
 * Server-side base URL for admin-api (prefer internal URL in Docker).
 */
export function getAdminApiBaseUrl(): string {
  const base =
    process.env.ADMIN_API_INTERNAL_URL ??
    process.env.ADMIN_API_URL ??
    process.env.NEXT_PUBLIC_ADMIN_API_URL;
  if (!base) {
    throw new Error(
      "Missing ADMIN_API_INTERNAL_URL, ADMIN_API_URL, or NEXT_PUBLIC_ADMIN_API_URL",
    );
  }
  return base.replace(/\/$/, "");
}
