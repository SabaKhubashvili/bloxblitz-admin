"use client";

import {
  fetchRoulettePlayers,
  type RoulettePlayersSortField,
} from "@/lib/admin-api/roulette-players";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const STALE_MS = 45_000;

export function useRoulettePlayers(opts: {
  username?: string;
  page: number;
  limit: number;
  sort: RoulettePlayersSortField;
  order: "asc" | "desc";
}) {
  const deferredUser = useDeferredValue(opts.username?.trim() ?? "");

  const query = useQuery({
    queryKey: [
      "roulettePlayers",
      deferredUser,
      opts.page,
      opts.limit,
      opts.sort,
      opts.order,
    ] as const,
    queryFn: ({ signal }) =>
      fetchRoulettePlayers({
        username: deferredUser || undefined,
        page: opts.page,
        limit: opts.limit,
        sort: opts.sort,
        order: opts.order,
        signal,
      }),
    staleTime: STALE_MS,
  });

  return {
    data: query.data,
    loading: query.isLoading,
    isError: query.isError,
    errorMessage:
      query.error instanceof Error ? query.error.message : null,
  };
}

export function useRoulettePlayersControls() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<RoulettePlayersSortField>("wagered");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  return { q, setQ, page, setPage, sort, setSort, order, setOrder };
}
