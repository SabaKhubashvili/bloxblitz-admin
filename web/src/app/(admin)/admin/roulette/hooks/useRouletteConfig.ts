"use client";

import {
  getRouletteConfigWithAxios,
  postRouletteConfigWithAxios,
  type RouletteConfigApi,
} from "@/lib/admin-api/roulette-config-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const ROULETTE_CONFIG_QUERY_KEY = ["admin", "roulette", "config"] as const;

const STALE_MS = 30_000;

export function useRouletteConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ROULETTE_CONFIG_QUERY_KEY,
    queryFn: () => getRouletteConfigWithAxios(),
    staleTime: STALE_MS,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<RouletteConfigApi>) =>
      postRouletteConfigWithAxios(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(ROULETTE_CONFIG_QUERY_KEY, updated);
    },
  });

  return {
    config: query.data,
    isLoadingConfig: query.isPending,
    isFetchingConfig: query.isFetching,
    configError: query.isError ? query.error : null,
    refetchConfig: query.refetch,
    savePartialConfig: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
    resetSaveError: mutation.reset,
  };
}
