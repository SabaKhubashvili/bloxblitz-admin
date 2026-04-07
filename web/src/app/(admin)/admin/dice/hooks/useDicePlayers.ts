"use client";

import { fetchDicePlayers } from "@/lib/admin-api/dice-players";
import type {
  DicePlayersSortField,
  FetchDicePlayersParams,
} from "@/lib/admin-api/dice-players";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const STALE_MS = 60_000;

export function useDicePlayers(params: FetchDicePlayersParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 50));
  const sort = params.sort ?? "rolls";
  const order = params.order ?? "desc";
  const username = params.username?.trim() || undefined;
  const moderationStatus = params.moderationStatus;

  return useQuery({
    queryKey: [
      "dicePlayers",
      username ?? "",
      page,
      limit,
      sort,
      order,
      moderationStatus ?? "",
    ] as const,
    queryFn: () =>
      fetchDicePlayers({
        username,
        page,
        limit,
        sort,
        order,
        moderationStatus,
      }),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export type { DicePlayersSortField };
