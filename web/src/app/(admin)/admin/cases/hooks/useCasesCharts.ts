"use client";

import {
  fetchCasesOpeningsChart,
  fetchCasesRevenueChart,
  type CasesChartApiResponse,
} from "@/lib/admin-api/cases-charts";
import type { TimeRange } from "../mock/types";
import { useEffect, useState } from "react";

export function useCasesCharts(range: TimeRange) {
  const [loading, setLoading] = useState(true);
  const [openings, setOpenings] = useState<CasesChartApiResponse | null>(null);
  const [revenue, setRevenue] = useState<CasesChartApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [o, r] = await Promise.all([
          fetchCasesOpeningsChart(range),
          fetchCasesRevenueChart(range),
        ]);
        if (!cancelled) {
          setOpenings(o);
          setRevenue(r);
        }
      } catch {
        if (!cancelled) {
          setOpenings(null);
          setRevenue(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return { loading, openings, revenue };
}
