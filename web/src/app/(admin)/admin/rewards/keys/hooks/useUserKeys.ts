"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserKeyBalances,
  setUserKeyBalance,
} from "@/lib/admin-api/reward-case-keys-admin";

export const userKeysKey = (username: string) =>
  ["admin", "reward-case-keys", username] as const;

export function useUserKeyBalances(username: string | null) {
  return useQuery({
    queryKey: userKeysKey(username ?? ""),
    queryFn: () => fetchUserKeyBalances(username!),
    enabled: username !== null && username.trim().length > 0,
    staleTime: 15_000,
  });
}

export function useSetUserKeyBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setUserKeyBalance,
    onSuccess: (_result, vars) => {
      void qc.invalidateQueries({
        queryKey: userKeysKey(vars.username),
      });
    },
  });
}
