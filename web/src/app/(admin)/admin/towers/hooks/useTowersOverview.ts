"use client";

import { fetchTowersOverviewApi } from "@/lib/admin-api/towers-overview";
import type { TowersTimeRange } from "../types";
import { useQuery } from "@tanstack/react-query";

const STALE_MS = 30_000;
const REFETCH_INTERVAL_MS = 25_000;

export function useTowersOverview(range: TowersTimeRange) {
  const query = useQuery({
    queryKey: ["towersOverview", range] as const,
    queryFn: ({ signal }) => fetchTowersOverviewApi(range, { signal }),
    staleTime: STALE_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  return {
    loading: query.isLoading,
    isError: query.isError,
    errorMessage:
      query.error instanceof Error ? query.error.message : null,
    data: query.data ?? null,
    reload: query.refetch,
  };
}
