import type { TimeRange } from "../mock/types";

/** X-axis labels: 24h → `14:00` UTC; 7d/30d → `Mar 28` UTC. */
export function formatDiceAnalyticsAxisLabel(
  iso: string,
  range: TimeRange,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  if (range === "24h") {
    const h = d.getUTCHours();
    return `${String(h).padStart(2, "0")}:00`;
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
