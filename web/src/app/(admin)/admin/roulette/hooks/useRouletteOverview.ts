"use client";

import { fetchRouletteAnalytics } from "@/lib/admin-api/roulette-analytics";
import type { TimeRange } from "../../dice/mock/types";
import { useQuery } from "@tanstack/react-query";
import { formatDiceAnalyticsAxisLabel } from "../../dice/hooks/dice-analytics-axis-label";

export type RouletteOverviewStats = {
  totalGames: number;
  totalWagered: number;
  totalProfitLoss: number;
  activePlayers: number;
};

export type RouletteGamesPoint = { label: string; count: number };
export type RoulettePlPoint = { x: string; y: number };

const STALE_MS = 30_000;
const REFETCH_INTERVAL_MS = 25_000;

function mapApiToUi(range: TimeRange, raw: Awaited<ReturnType<typeof fetchRouletteAnalytics>>) {
  const stats: RouletteOverviewStats = {
    totalGames: raw.metrics.totalGames,
    totalWagered: raw.metrics.totalWagered,
    totalProfitLoss: raw.metrics.profit,
    activePlayers: raw.metrics.activePlayers,
  };

  const gamesSeries: RouletteGamesPoint[] = raw.charts.gamesPlayedOverTime.map(
    (d) => ({
      label: formatDiceAnalyticsAxisLabel(d.timestamp, range),
      count: d.count,
    }),
  );

  const plSeries: RoulettePlPoint[] = raw.charts.profitOverTime.map((d) => ({
    x: formatDiceAnalyticsAxisLabel(d.timestamp, range),
    y: d.profit - d.loss,
  }));

  const outcomeDist = raw.charts.outcomeDistribution.map((o) => ({
    label: o.outcome,
    y: o.count,
  }));

  return { stats, gamesSeries, plSeries, outcomeDist };
}

export function useRouletteOverview(range: TimeRange) {
  const query = useQuery({
    queryKey: ["rouletteAnalytics", range] as const,
    queryFn: ({ signal }) => fetchRouletteAnalytics(range, { signal }),
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
    gamesSeries: mapped?.gamesSeries ?? [],
    plSeries: mapped?.plSeries ?? [],
    outcomeDist: mapped?.outcomeDist ?? [],
    reload: query.refetch,
  };
}
