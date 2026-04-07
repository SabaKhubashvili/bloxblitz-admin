"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecentCaseOpens } from "@/lib/admin-api/recent-case-opens";

export function useRecentCaseOpens() {
  return useQuery({
    queryKey: ["recentCaseOpens"] as const,
    queryFn: () => fetchRecentCaseOpens(),
    staleTime: 30_000,
  });
}
