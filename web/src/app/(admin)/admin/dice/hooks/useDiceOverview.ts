"use client";

import { fetchDiceAnalytics } from "@/lib/admin-api/dice-analytics";
import type { TimeRange } from "../mock/types";
import { useQuery } from "@tanstack/react-query";
import { formatDiceAnalyticsAxisLabel } from "./dice-analytics-axis-label";

export type DiceOverviewStats = {
  totalRolls: number;
  totalWagered: number;
  totalProfitLoss: number;
  activePlayers: number;
};

export type DiceRollBucket = { label: string; count: number };
export type DicePlPoint = { x: string; y: number };
export type DiceBetDistPoint = { label: string; y: number };

const STALE_MS = 30_000;
const REFETCH_INTERVAL_MS = 25_000;

function mapApiToUi(
  range: TimeRange,
  raw: Awaited<ReturnType<typeof fetchDiceAnalytics>>,
) {
  const stats: DiceOverviewStats = {
    totalRolls: raw.metrics.totalRolls,
    totalWagered: raw.metrics.totalWagered,
    totalProfitLoss: raw.metrics.profit,
    activePlayers: raw.metrics.activePlayers,
  };

  const rollBuckets: DiceRollBucket[] = raw.charts.rollDistribution.map(
    (d) => ({
      label: String(d.value),
      count: d.count,
    }),
  );

  const plSeries: DicePlPoint[] = raw.charts.profitOverTime.map((d) => ({
    x: formatDiceAnalyticsAxisLabel(d.timestamp, range),
    y: d.profit - d.loss,
  }));

  const betDist: DiceBetDistPoint[] = raw.charts.betDistribution.map(
    (d) => ({
      label: d.range,
      y: d.count,
    }),
  );

  return { stats, rollBuckets, plSeries, betDist };
}

export function useDiceOverview(range: TimeRange) {
  const query = useQuery({
    queryKey: ["diceAnalytics", range] as const,
    queryFn: ({ signal }) => fetchDiceAnalytics(range, { signal }),
    staleTime: STALE_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const mapped = query.data ? mapApiToUi(range, query.data) : null;

  return {
    loading: query.isLoading,
    isError: query.isError,
    errorMessage:
      query.error instanceof Error ? query.error.message : null,
    stats: mapped?.stats ?? null,
    rollBuckets: mapped?.rollBuckets ?? [],
    plSeries: mapped?.plSeries ?? [],
    betDist: mapped?.betDist ?? [],
    reload: query.refetch,
  };
}
