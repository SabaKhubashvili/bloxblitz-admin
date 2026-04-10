"use client";

import { fetchRouletteOperatorState } from "@/lib/admin-api/roulette-operator";
import { useQuery } from "@tanstack/react-query";

const STALE_MS = 5_000;
const REFETCH_MS = 4_000;

export function useRouletteOperatorState() {
  const query = useQuery({
    queryKey: ["rouletteOperatorState"] as const,
    queryFn: ({ signal }) => fetchRouletteOperatorState({ signal }),
    staleTime: STALE_MS,
    refetchInterval: REFETCH_MS,
  });

  return {
    data: query.data,
    loading: query.isLoading,
    isError: query.isError,
    errorMessage:
      query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
