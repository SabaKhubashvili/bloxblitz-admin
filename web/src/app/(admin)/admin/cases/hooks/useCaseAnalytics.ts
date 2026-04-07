"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCaseAnalytics } from "@/lib/admin-api/case-analytics";
import type { TimeRange } from "../mock/types";

export function useCaseAnalytics(
  caseId: string | null,
  range: TimeRange,
  mostWonLimit = 10
) {
  return useQuery({
    queryKey: ["caseAnalytics", caseId, range, mostWonLimit] as const,
    queryFn: () => fetchCaseAnalytics(caseId!, { range, limit: mostWonLimit }),
    enabled: Boolean(caseId),
  });
}
