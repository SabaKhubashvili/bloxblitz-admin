"use client";

import type {
  CrashControlRoomRange,
  CrashPlayerActivityChartPoint,
  CrashProfitLossChartPoint,
  CrashStatisticsOverview,
} from "@/lib/admin-api/crash-control-room";
import {
  fetchCrashControlOverview,
  fetchCrashPlayerActivityChart,
  fetchCrashProfitLossChart,
} from "@/lib/admin-api/crash-control-room";
import type { OverviewStats } from "../mock/types";
import type { MultiplierChartPoint } from "./useCrashMultiplierHistory";
import { useCallback, useEffect, useState } from "react";

function mapOverviewToStats(o: CrashStatisticsOverview): OverviewStats {
  return {
    totalWagered: o.totalWagered,
    totalProfitLoss: o.profitLoss,
    activePlayers: o.activePlayers,
    totalBetsCount: o.totalBets,
    totalPayout: o.totalPayout,
  };
}

function buildActivitySeries(
  rows: CrashPlayerActivityChartPoint[],
): MultiplierChartPoint[] {
  return rows.map((r) => ({ x: r.time, y: r.activePlayers }));
}

export function useCrashControlRoomData(range: CrashControlRoomRange) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<CrashStatisticsOverview | null>(
    null,
  );
  const [profitLossHourly, setProfitLossHourly] = useState<
    CrashProfitLossChartPoint[] | null
  >(null);
  const [activityHourly, setActivityHourly] = useState<
    CrashPlayerActivityChartPoint[] | null
  >(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, pl, act] = await Promise.all([
        fetchCrashControlOverview(range),
        fetchCrashProfitLossChart(),
        fetchCrashPlayerActivityChart(),
      ]);
      setOverview(ov);
      setProfitLossHourly(pl);
      setActivityHourly(act);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load crash data");
      setOverview(null);
      setProfitLossHourly(null);
      setActivityHourly(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = overview ? mapOverviewToStats(overview) : null;
  const actSeries =
    activityHourly !== null ? buildActivitySeries(activityHourly) : [];

  return {
    loading,
    error,
    stats,
    overview,
    profitLossHourly: profitLossHourly ?? [],
    actSeries,
    reload,
  };
}
