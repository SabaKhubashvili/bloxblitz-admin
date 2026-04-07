"use client";

import { getSuspiciousGames } from "@/lib/admin-api/coinflip-fraud";
import { useQuery } from "@tanstack/react-query";
import { COINFLIP_FRAUD_GAMES_KEY } from "./coinflip-fraud-query-keys";

export type SuspiciousGamesFilters = {
  minScore: number;
  maxScore: number;
  offset: number;
  limit: number;
};

const POLL_MS = 18_000;

export function useSuspiciousGames(filters: SuspiciousGamesFilters) {
  return useQuery({
    queryKey: [...COINFLIP_FRAUD_GAMES_KEY, filters] as const,
    queryFn: ({ signal }) => getSuspiciousGames(filters, { signal }),
    refetchInterval: POLL_MS,
  });
}
