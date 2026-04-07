"use client";

import { getCoinflipPlayerHistory } from "@/lib/admin-api/coinflip-players";
import { useQuery } from "@tanstack/react-query";
import { coinflipPlayerHistoryQueryKey } from "./coinflip-players-query-keys";

export function useCoinflipPlayerHistory(
  username: string | null,
  page: number,
  limit: number,
) {
  return useQuery({
    queryKey: coinflipPlayerHistoryQueryKey(username ?? "", page, limit),
    queryFn: ({ signal }) =>
      getCoinflipPlayerHistory(username!, { page, limit }, { signal }),
    enabled: !!username && username.length > 0,
    staleTime: 20_000,
  });
}
