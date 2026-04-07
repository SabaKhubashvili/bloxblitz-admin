"use client";

import { fetchCoinflipUserModeration } from "@/lib/admin-api/coinflip-user-moderation";
import { useQueries } from "@tanstack/react-query";
import { coinflipUserModerationQueryKey } from "./coinflip-user-moderation-query-key";

const STALE_MS = 20_000;

/**
 * Per-username coinflip DB moderation + fraud risk-profile (for banUntil when present).
 * Intended for the current table page only (~25 rows).
 */
export function useCoinflipPlayersModerationMap(usernames: string[]) {
  const queries = useQueries({
    queries: usernames.map((username) => ({
      queryKey: coinflipUserModerationQueryKey(username),
      queryFn: () => fetchCoinflipUserModeration(username),
      enabled: username.length > 0,
      staleTime: STALE_MS,
    })),
  });

  const byUser = new Map<
    string,
    NonNullable<(typeof queries)[number]["data"]>
  >();
  usernames.forEach((u, i) => {
    const row = queries[i]?.data;
    if (row) byUser.set(u, row);
  });

  const indexByUser = new Map<string, number>();
  usernames.forEach((u, i) => indexByUser.set(u, i));

  const getState = (username: string) => {
    const i = indexByUser.get(username);
    if (i === undefined) {
      return {
        data: undefined as undefined,
        isPending: false,
        isError: false,
      };
    }
    const q = queries[i];
    return {
      data: q.data,
      isPending: Boolean(q.isPending && q.fetchStatus !== "idle"),
      isError: Boolean(q.isError),
    };
  };

  const isLoading =
    usernames.length > 0 &&
    queries.some((q) => q.isPending && q.fetchStatus !== "idle");

  const refetchAll = () =>
    Promise.all(queries.map((q) => q.refetch())).then(() => undefined);

  return { byUser, getState, queries, isLoading, refetchAll };
}
