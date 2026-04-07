/** e.g. `2026-04-05 18:00:00 UTC` */
export function formatBannedUntilUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatRemainingBanLabel(untilIso: string): string | null {
  const end = new Date(untilIso).getTime();
  if (!Number.isFinite(end)) return null;
  const now = Date.now();
  const ms = end - now;
  if (ms <= 0) return "Expired (refresh to sync)";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  if (h >= 1) return `${h}h ${m}m left`;
  if (m >= 1) return `${m}m left`;
  return "under 1m left";
}
