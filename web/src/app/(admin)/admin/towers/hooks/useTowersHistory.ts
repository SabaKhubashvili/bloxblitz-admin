"use client";

import {
  fetchTowersHistoryApi,
  type TowersHistoryQuery,
} from "@/lib/admin-api/towers-history";
import { useQuery } from "@tanstack/react-query";

export function useTowersHistory(filters: TowersHistoryQuery) {
  const query = useQuery({
    queryKey: ["towersHistory", filters] as const,
    queryFn: ({ signal }) => fetchTowersHistoryApi(filters, { signal }),
    staleTime: 15_000,
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
