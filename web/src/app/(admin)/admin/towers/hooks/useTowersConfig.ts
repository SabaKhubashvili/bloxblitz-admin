"use client";

import {
  fetchTowersConfigApi,
  saveTowersConfigApi,
  type TowersConfigApi,
  type TowersConfigBetsUpdate,
} from "@/lib/admin-api/towers-config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

const KEY = ["towersConfig"] as const;

export function useTowersConfig() {
  const qc = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => fetchTowersConfigApi({ signal }),
    staleTime: 20_000,
  });

  const mut = useMutation({
    mutationFn: (body: TowersConfigBetsUpdate) => saveTowersConfigApi(body),
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      setSaveError(null);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const save = useCallback(
    async (body: TowersConfigBetsUpdate) => {
      setSaveError(null);
      return mut.mutateAsync(body);
    },
    [mut],
  );

  return {
    config: q.data ?? null,
    isLoadingConfig: q.isLoading,
    isSaving: mut.isPending,
    saveError,
    save,
    reload: q.refetch,
  };
}
