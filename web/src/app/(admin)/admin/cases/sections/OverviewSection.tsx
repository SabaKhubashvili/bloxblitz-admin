"use client";

import { CasesChartContainer } from "../components/CasesChartContainer";
import { CaseSummaryCard } from "../components/CaseSummaryCard";
import { formatCompact, formatMoney } from "../components/formatMoney";
import { CasesStatCard } from "../components/CasesStatCard";
import { TimeRangeToggle } from "../components/TimeRangeToggle";
import { useCasesAdmin } from "../context/CasesAdminContext";
import { useCasesCharts } from "../hooks/useCasesCharts";
import { useCasesPopular } from "../hooks/useCasesPopular";
import { useCasesOverview } from "../hooks/useCasesOverview";
import type { CasesOverviewStats, TimeRange } from "../mock/types";
import {
  buildOpeningsChartOptions,
  buildRevenueChartOptions,
  formatCasesChartXLabel,
} from "../utils/casesChartAxis";
import { useMemo } from "react";

interface OverviewSectionProps {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  initialCasesOverview?: CasesOverviewStats | null;
}

export function OverviewSection({
  range,
  onRangeChange,
  initialCasesOverview = null,
}: OverviewSectionProps) {
  const { cases } = useCasesAdmin();
  const { loading, stats } = useCasesOverview(
    range,
    cases,
    initialCasesOverview,
  );
  const {
    loading: chartsLoading,
    openings: openingsChart,
    revenue: revenueChart,
  } = useCasesCharts(range);

  const { loading: popularLoading, topCases } = useCasesPopular(range);

  const openingsCategories = useMemo(() => {
    const raw = openingsChart?.labels ?? [];
    return raw.map((l) => formatCasesChartXLabel(l, range));
  }, [openingsChart?.labels, range]);

  const revenueCategories = useMemo(() => {
    const raw = revenueChart?.labels ?? [];
    return raw.map((l) => formatCasesChartXLabel(l, range));
  }, [revenueChart?.labels, range]);

  const openOpts = useMemo(
    () => buildOpeningsChartOptions(range, openingsCategories),
    [range, openingsCategories],
  );

  const revOpts = useMemo(
    () => buildRevenueChartOptions(range, revenueCategories),
    [range, revenueCategories],
  );

  const openingsSeriesData = openingsChart?.datasets[0]?.data ?? [];
  const revenueSeriesData = revenueChart?.datasets[0]?.data ?? [];

  const chartSubtitle =
    range === "24h"
      ? "UTC hourly · from admin-api"
      : "UTC daily · from admin-api";

  return (
    <section id="overview" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Cases overview
          </h2>
          <p className="text-sm text-zinc-500">
            Catalog counts are current; KPIs and charts use the selected window
            from admin-api (UTC buckets).
          </p>
        </div>
        <TimeRangeToggle value={range} onChange={onRangeChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CasesStatCard
          label="Total cases"
          value={stats ? String(stats.totalCases) : "—"}
          loading={loading}
        />
        <CasesStatCard
          label="Active cases"
          value={stats ? String(stats.activeCases) : "—"}
          loading={loading}
        />
        <CasesStatCard
          label="Total opened"
          value={
            stats ? formatCompact(stats.totalOpened) : "—"
          }
          loading={loading}
          hint={`Window: ${range}`}
        />
        <CasesStatCard
          label="Revenue from cases"
          value={stats ? formatMoney(stats.totalRevenue) : "—"}
          loading={loading}
          hint={`Window: ${range}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CasesChartContainer
          title="Case openings over time"
          subtitle={chartSubtitle}
          loading={chartsLoading}
          kind="area"
          series={[
            {
              name: openingsChart?.datasets[0]?.label ?? "Case openings",
              data: openingsSeriesData,
            },
          ]}
          options={openOpts}
        />
        <CasesChartContainer
          title="Revenue from cases"
          subtitle={chartSubtitle}
          loading={chartsLoading}
          kind="area"
          series={[
            {
              name: revenueChart?.datasets[0]?.label ?? "Revenue",
              data: revenueSeriesData,
            },
          ]}
          options={revOpts}
        />
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-300">
          Most popular cases
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          By opens in the selected window ({range}) · from admin-api
        </p>
        {popularLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : !topCases || topCases.length === 0 ? (
          <p className="text-sm text-zinc-500">No opens in this window.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topCases.map((c, i) => (
              <CaseSummaryCard key={c.id} caseRecord={c} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
