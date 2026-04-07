"use client";

import type { DiceAnalyticsRange } from "@/lib/admin-api/dice-analytics";
import {
  fetchDiceHeatmap,
  fetchDiceRiskAnalytics,
  fetchDiceScatter,
  fetchDiceTargetRanges,
} from "@/lib/admin-api/dice-analytics-detail";
import type { TimeRange } from "../mock/types";
import { useQuery } from "@tanstack/react-query";

const STALE_MS = 45_000;

export type DiceAnalyticsFilters = {
  player?: string;
  minBet?: number;
  maxBet?: number;
};

export function useDiceAnalyticsDetail(
  range: TimeRange,
  filters: DiceAnalyticsFilters,
) {
  const apiRange = range as DiceAnalyticsRange;
  const player = filters.player?.trim() || undefined;

  const heatmap = useQuery({
    queryKey: ["diceAnalyticsDetail", "heatmap", apiRange, player] as const,
    queryFn: () => fetchDiceHeatmap(apiRange, player),
    staleTime: STALE_MS,
  });

  const targetRanges = useQuery({
    queryKey: ["diceAnalyticsDetail", "targetRanges", apiRange, player] as const,
    queryFn: () => fetchDiceTargetRanges(apiRange, player),
    staleTime: STALE_MS,
  });

  const scatter = useQuery({
    queryKey: [
      "diceAnalyticsDetail",
      "scatter",
      apiRange,
      player,
      filters.minBet ?? null,
      filters.maxBet ?? null,
    ] as const,
    queryFn: () =>
      fetchDiceScatter(apiRange, {
        player,
        minBet: filters.minBet,
        maxBet: filters.maxBet,
      }),
    staleTime: STALE_MS,
  });

  const risk = useQuery({
    queryKey: ["diceAnalyticsDetail", "risk", apiRange] as const,
    queryFn: () => fetchDiceRiskAnalytics(apiRange),
    staleTime: STALE_MS,
  });

  return { heatmap, targetRanges, scatter, risk };
}
