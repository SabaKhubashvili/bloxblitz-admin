"use client";

import { fetchCasesPopular } from "@/lib/admin-api/cases-charts";
import type { TimeRange } from "../mock/types";
import type { CaseCardModel } from "../components/CaseSummaryCard";
import { useEffect, useState } from "react";

export function useCasesPopular(range: TimeRange) {
  const [loading, setLoading] = useState(true);
  const [topCases, setTopCases] = useState<CaseCardModel[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetchCasesPopular(range);
        if (cancelled) return;
        setTopCases(
          res.cases.map((c) => ({
            id: c.id,
            name: c.name,
            price: c.price,
            totalOpened: c.opens,
          })),
        );
      } catch {
        if (!cancelled) setTopCases(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return { loading, topCases };
}
