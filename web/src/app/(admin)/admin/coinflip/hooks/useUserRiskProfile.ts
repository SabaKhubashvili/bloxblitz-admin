"use client";

import { getUserRiskProfile } from "@/lib/admin-api/coinflip-fraud";
import { useQuery } from "@tanstack/react-query";
import { coinflipFraudProfileQueryKey } from "./coinflip-fraud-query-keys";

const POLL_MS = 20_000;

export function useUserRiskProfile(username: string | null, enabled = true) {
  const u = username?.trim() ?? "";
  return useQuery({
    queryKey: coinflipFraudProfileQueryKey(u),
    queryFn: ({ signal }) => getUserRiskProfile(u, { signal }),
    enabled: enabled && u.length > 0,
    refetchInterval: enabled && u.length > 0 ? POLL_MS : false,
  });
}
