"use client";

import { fetchRouletteRecentBets } from "@/lib/admin-api/roulette-recent-bets";
import { useQuery } from "@tanstack/react-query";

const STALE_MS = 20_000;

export function useRouletteRecentBets(opts: {
  player?: string;
  limit?: number;
}) {
  const limit = opts.limit ?? 30;
  const player = opts.player?.trim() ?? "";

  const query = useQuery({
    queryKey: ["rouletteRecentBets", limit, player] as const,
    queryFn: ({ signal }) =>
      fetchRouletteRecentBets({ limit, player: player || undefined, signal }),
    staleTime: STALE_MS,
  });

  return {
    bets: query.data?.bets ?? [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    errorMessage:
      query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
