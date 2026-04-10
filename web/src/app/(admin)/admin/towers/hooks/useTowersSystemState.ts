"use client";

import {
  fetchTowersSystemStateApi,
  saveTowersSystemStateApi,
  type TowersSystemMode,
} from "@/lib/admin-api/towers-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const KEY = ["towersSystemState"] as const;

export function useTowersSystemState() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => fetchTowersSystemStateApi({ signal }),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const mut = useMutation({
    mutationFn: (mode: TowersSystemMode) => saveTowersSystemStateApi(mode),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });

  return {
    state: q.data ?? null,
    loading: q.isLoading,
    setMode: mut.mutateAsync,
    isSaving: mut.isPending,
    reload: q.refetch,
  };
}
