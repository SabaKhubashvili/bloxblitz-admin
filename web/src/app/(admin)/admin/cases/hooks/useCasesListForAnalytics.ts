"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCasesList } from "@/lib/admin-api/cases-list";

const PAGE_SIZE = 500;

/** Same `/admin/cases/list` source as the cases table; large page for dropdown + slugs. */
export function useCasesListForAnalytics() {
  return useQuery({
    queryKey: ["casesList", "analytics", PAGE_SIZE] as const,
    queryFn: () =>
      fetchCasesList({ page: 1, status: "all", pageSize: PAGE_SIZE }),
  });
}
