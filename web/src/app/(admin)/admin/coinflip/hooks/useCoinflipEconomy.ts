"use client";

import {
  fetchCoinflipEconomy,
  updateCoinflipEconomy,
  type CoinflipEconomyConfig,
} from "@/lib/admin-api/coinflip-economy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const COINFLIP_ECONOMY_QUERY_KEY = ["coinflip-economy"] as const;

export function useCoinflipEconomy() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: COINFLIP_ECONOMY_QUERY_KEY,
    queryFn: ({ signal }) => fetchCoinflipEconomy({ signal }),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<CoinflipEconomyConfig>) =>
      updateCoinflipEconomy(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(COINFLIP_ECONOMY_QUERY_KEY, updated);
      void queryClient.invalidateQueries({ queryKey: COINFLIP_ECONOMY_QUERY_KEY });
    },
  });

  return {
    ...query,
    updateEconomy: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: mutation.error,
    resetSaveError: mutation.reset,
  };
}
