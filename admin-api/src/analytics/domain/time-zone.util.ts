/** Rejects values that are not safe to pass into Postgres `timezone()` / UI formatting. */
const SAFE_TZ = /^[A-Za-z0-9_+\-/]+$/;

export function isValidIanaTimeZone(tz: string): boolean {
  if (!SAFE_TZ.test(tz) || tz.length > 80) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
