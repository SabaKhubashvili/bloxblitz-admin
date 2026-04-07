"use client";

import { fetchCasesOverviewStats } from "@/lib/admin-api/cases-overview";
import type { CaseRecord, CasesOverviewStats, TimeRange } from "../mock/types";
import { useEffect, useRef, useState } from "react";

export function useCasesOverview(
  range: TimeRange,
  _cases: CaseRecord[],
  initialStats: CasesOverviewStats | null = null,
) {
  const [initialSnapshot] = useState(initialStats);
  const hydrated =
    initialSnapshot !== null && initialSnapshot.range === range;
  const [loading, setLoading] = useState(!hydrated);
  const [stats, setStats] = useState<CasesOverviewStats | null>(() =>
    hydrated ? initialSnapshot : null,
  );
  const isFirstFetchRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const skipLoading =
        isFirstFetchRef.current &&
        initialSnapshot !== null &&
        initialSnapshot.range === range;
      if (isFirstFetchRef.current) {
        isFirstFetchRef.current = false;
      }
      if (!skipLoading) setLoading(true);
      try {
        const s = await fetchCasesOverviewStats(range);
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) setStats((prev) => prev);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, initialSnapshot]);

  return { loading, stats };
}
