"use client";

import { fetchCoinflipOverview } from "@/lib/admin-api/coinflip-overview";
import type { TimeRange } from "../mock/types";
import { useQuery } from "@tanstack/react-query";

export function useCoinflipOverview(range: TimeRange) {
  const query = useQuery({
    queryKey: ["coinflipOverview", range] as const,
    queryFn: ({ signal }) => fetchCoinflipOverview(range, { signal }),
    staleTime: 30_000,
  });

  const isError = query.isError;
  const raw = query.data;

  const stats = isError ? null : raw?.stats ?? null;
  const gamesSeries = isError ? [] : raw?.charts.gamesCreated ?? [];
  const wagerSeries = isError ? [] : raw?.charts.wagerVolume ?? [];
  const activitySeries = isError ? [] : raw?.charts.playerActivity ?? [];

  const loading = query.isPending;

  return {
    loading,
    stats,
    gamesSeries,
    wagerSeries,
    activitySeries,
    reload: query.refetch,
  };
}
