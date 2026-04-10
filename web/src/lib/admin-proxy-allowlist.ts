/**
 * Allowed admin-api paths for the browser-facing proxy (SSRF guard).
 * Extend as you add admin-api routes the dashboard should call from the client.
 */
const ALLOWED_EXACT = new Set<string>(["auth/me"]);

const ALLOWED_PREFIXES = [
  "internal/",
  "admin/users",
  "admin/analytics",
  "admin/crash",
  "admin/coinflip",
  "admin/mines",
  "admin/dice",
  "admin/roulette",
  "admin/towers",
  "admin/races",
  "admin/cases",
  "admin/pets",
  "admin/reward-cases",
  "admin/reward-case-keys",
];

export function isAdminProxyPathAllowed(segments: string[]): boolean {
  if (segments.length === 0) return false;
  const path = segments.join("/");
  if (ALLOWED_EXACT.has(path)) return true;
  return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p));
}
