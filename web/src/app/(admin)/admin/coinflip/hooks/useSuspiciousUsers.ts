"use client";

import { getSuspiciousUsers } from "@/lib/admin-api/coinflip-fraud";
import { useQuery } from "@tanstack/react-query";
import { COINFLIP_FRAUD_USERS_KEY } from "./coinflip-fraud-query-keys";

export type SuspiciousUsersFilters = {
  minScore: number;
  maxScore: number;
  offset: number;
  limit: number;
};

const POLL_MS = 18_000;

export function useSuspiciousUsers(filters: SuspiciousUsersFilters) {
  return useQuery({
    queryKey: [...COINFLIP_FRAUD_USERS_KEY, filters] as const,
    queryFn: ({ signal }) => getSuspiciousUsers(filters, { signal }),
    refetchInterval: POLL_MS,
  });
}
