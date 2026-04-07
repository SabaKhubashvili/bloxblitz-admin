"use client";

import {
  getDiceConfigWithAxios,
  patchDiceConfigWithAxios,
  type DiceConfigApi,
} from "@/lib/admin-api/dice-config-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const DICE_CONFIG_QUERY_KEY = ["admin", "dice", "config"] as const;

const STALE_MS = 30_000;

export function useDiceConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: DICE_CONFIG_QUERY_KEY,
    queryFn: () => getDiceConfigWithAxios(),
    staleTime: STALE_MS,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<DiceConfigApi>) =>
      patchDiceConfigWithAxios(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(DICE_CONFIG_QUERY_KEY, updated);
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
