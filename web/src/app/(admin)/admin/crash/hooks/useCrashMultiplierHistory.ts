"use client";

import type { CrashMultiplierHistoryEntry } from "@/lib/admin-api/crash-control-room";
import { fetchCrashMultiplierHistory } from "@/lib/admin-api/crash-control-room";
import { useCallback, useEffect, useState } from "react";

export type MultiplierChartPoint = { x: string; y: number };

function buildMultiplierChartSeries(
  entries: CrashMultiplierHistoryEntry[],
): MultiplierChartPoint[] {
  const chronological = [...entries].reverse();
  return chronological.map((r) => ({
    x: new Date(r.createdAt).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    y: r.crashMultiplier,
  }));
}

/** Loads crash round multiplier trail for the chart and round history table (admin-api). */
export function useCrashMultiplierHistory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<CrashMultiplierHistoryEntry[] | null>(
    null,
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCrashMultiplierHistory();
      setEntries(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load round history",
      );
      setEntries(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const multSeries =
    entries !== null ? buildMultiplierChartSeries(entries) : [];

  return { loading, error, entries, multSeries, reload };
}
