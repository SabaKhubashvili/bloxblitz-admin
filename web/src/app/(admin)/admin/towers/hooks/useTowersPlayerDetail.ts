"use client";

import { fetchTowersPlayerDetailApi } from "@/lib/admin-api/towers-players";
import { useQuery } from "@tanstack/react-query";

export function useTowersPlayerDetail(username: string | null) {
  return useQuery({
    queryKey: ["towersPlayerDetail", username] as const,
    queryFn: ({ signal }) =>
      fetchTowersPlayerDetailApi(username!, { signal }),
    enabled: Boolean(username && username.length > 0),
    staleTime: 15_000,
  });
}
