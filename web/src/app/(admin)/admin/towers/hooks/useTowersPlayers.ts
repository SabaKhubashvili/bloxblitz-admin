"use client";

import { fetchTowersPlayersApi } from "@/lib/admin-api/towers-players";
import { useQuery } from "@tanstack/react-query";

export function useTowersPlayers(
  search: string,
  page: number,
  limit: number,
) {
  return useQuery({
    queryKey: ["towersPlayers", search, page, limit] as const,
    queryFn: ({ signal }) =>
      fetchTowersPlayersApi(search, page, limit, { signal }),
    staleTime: 20_000,
  });
}
