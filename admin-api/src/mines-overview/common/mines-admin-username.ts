/** Max length aligned with typical User.username storage. */
export const MINES_ADMIN_USERNAME_MAX_LEN = 64;

const CTRL_RE = /[\u0000-\u001F\u007F]/;

/**
 * Trim and reject control characters / excessive length. Returns null if unusable.
 */
export function normalizeMinesAdminUsernameParam(raw: string): string | null {
  let u: string;
  try {
    u = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (u.length === 0 || u.length > MINES_ADMIN_USERNAME_MAX_LEN) return null;
  if (CTRL_RE.test(u)) return null;
  return u;
}

/**
 * Optional search string for list endpoints (partial match). Empty = no filter.
 */
export function normalizeMinesPlayerSearch(raw: string | undefined): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;
  if (s.length > MINES_ADMIN_USERNAME_MAX_LEN) return null;
  if (CTRL_RE.test(s)) return null;
  return s;
}

/** Escape `%`, `_`, `\` for PostgreSQL ILIKE with ESCAPE '\'. */
export function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
