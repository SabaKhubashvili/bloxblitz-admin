"use client";

import {
  getCoinflipPlayers,
  type CoinflipPlayersListParams,
} from "@/lib/admin-api/coinflip-players";
import { useQuery } from "@tanstack/react-query";
import { coinflipPlayersListQueryKey } from "./coinflip-players-query-keys";

const STALE_MS = 30_000;

export function useCoinflipPlayers(filters: CoinflipPlayersListParams) {
  return useQuery({
    queryKey: coinflipPlayersListQueryKey(filters),
    queryFn: ({ signal }) => getCoinflipPlayers(filters, { signal }),
    staleTime: STALE_MS,
  });
}
