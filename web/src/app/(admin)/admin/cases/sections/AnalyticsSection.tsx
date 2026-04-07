"use client";

import { CasesChartContainer } from "../components/CasesChartContainer";
import { CaseSelect } from "../components/CaseSelect";
import { formatMoney } from "../components/formatMoney";
import { CasesPanelCard } from "../components/CasesPanelCard";
import { TimeRangeToggle } from "../components/TimeRangeToggle";
import { useCaseAnalytics } from "../hooks/useCaseAnalytics";
import { useCasesListForAnalytics } from "../hooks/useCasesListForAnalytics";
import type { TimeRange } from "../mock/types";
import {
  buildOpeningsChartOptions,
  formatCasesChartXLabel,
} from "../utils/casesChartAxis";
import type { ApexOptions } from "apexcharts";
import { useEffect, useMemo, useState } from "react";

interface AnalyticsSectionProps {
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
}

export function AnalyticsSection({
  selectedCaseId,
  onSelectCase,
}: AnalyticsSectionProps) {
  const [range, setRange] = useState<TimeRange>("30d");
  const {
    data: listPayload,
    isPending: listPending,
    isError: listError,
    error: listErr,
  } = useCasesListForAnalytics();

  const apiCases = listPayload?.cases ?? [];

  const selectedId = useMemo(() => {
    if (apiCases.length === 0) return null;
    if (selectedCaseId && apiCases.some((c) => c.id === selectedCaseId)) {
      return selectedCaseId;
    }
    return apiCases[0].id;
  }, [apiCases, selectedCaseId]);

  useEffect(() => {
    if (listPending || apiCases.length === 0 || selectedId == null) return;
    const inList =
      selectedCaseId != null &&
      apiCases.some((c) => c.id === selectedCaseId);
    if (!inList) {
      onSelectCase(selectedId);
    }
  }, [apiCases, listPending, onSelectCase, selectedCaseId, selectedId]);

  const selectOptions = useMemo(
    () =>
      apiCases.map((c) => ({
        value: c.id,
        label: `${c.name} · ${c.slug}`,
      })),
    [apiCases]
  );

  const effectiveCaseId = selectedId;
  const { data, isPending, isError, error, refetch } = useCaseAnalytics(
    effectiveCaseId,
    range,
    10
  );

  const openRateData = useMemo(
    () => data?.openRateOverTime.map((p) => p.openCount) ?? [],
    [data?.openRateOverTime]
  );

  const openCategories = useMemo(() => {
    const raw = data?.openRateOverTime.map((p) => p.date) ?? [];
    return raw.map((l) => formatCasesChartXLabel(l, range));
  }, [data?.openRateOverTime, range]);

  const openOpts: ApexOptions = useMemo(
    () => buildOpeningsChartOptions(range, openCategories),
    [range, openCategories]
  );

  const donutSeries = data?.itemDropDistribution.map((i) => i.dropCount) ?? [];
  const donutLabels =
    data?.itemDropDistribution.map(
      (i) => `${i.itemName} (${i.percentage.toFixed(1)}%)`
    ) ?? [];

  const chartSubtitle =
    range === "24h"
      ? "UTC hourly · gap-filled"
      : "UTC daily · gap-filled · from admin-api";

  if (listError) {
    return (
      <section id="analytics" className="scroll-mt-28 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-100">Analytics</h2>
        <CasesPanelCard title="Could not load case list">
          <p className="text-sm text-red-400">
            {listErr instanceof Error ? listErr.message : "Unknown error"}
          </p>
        </CasesPanelCard>
      </section>
    );
  }

  if (!listPending && apiCases.length === 0) {
    return (
      <section id="analytics" className="scroll-mt-28 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-100">Analytics</h2>
        <p className="text-sm text-zinc-500">
          No cases in the database yet. Create a case in the list above to see
          analytics.
        </p>
      </section>
    );
  }

  return (
    <section id="analytics" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Case analytics
          </h2>
          <p className="text-sm text-zinc-500">
            Per-case opens, revenue, RTP, and drop mix from admin-api.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TimeRangeToggle value={range} onChange={setRange} />
          <div className="min-w-[220px]">
            <CaseSelect
              id="analytics-case-pick"
              label="Selected case"
              value={effectiveCaseId ?? ""}
              onChange={onSelectCase}
              options={
                listPending
                  ? [{ value: "", label: "Loading cases…" }]
                  : selectOptions
              }
              disabled={listPending}
            />
          </div>
        </div>
      </div>

      {isError ? (
        <CasesPanelCard title="Could not load analytics">
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
          >
            Retry
          </button>
        </CasesPanelCard>
      ) : null}

      {!isError && effectiveCaseId ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Total opened"
              value={
                isPending
                  ? "…"
                  : (data?.overview.totalOpened ?? 0).toLocaleString()
              }
              loading={isPending}
            />
            <Metric
              label="Revenue"
              value={
                isPending ? "…" : formatMoney(data?.overview.revenue ?? 0)
              }
              loading={isPending}
            />
            <Metric
              label="Avg RTP"
              value={
                isPending
                  ? "…"
                  : `${(data?.overview.avgRtp ?? 0).toFixed(2)}%`
              }
              loading={isPending}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CasesChartContainer
              title="Open rate over time"
              subtitle={chartSubtitle}
              kind="line"
              height={260}
              loading={isPending}
              series={[{ name: "Opens", data: openRateData }]}
              options={openOpts}
            />
            {isPending ? (
              <CasesChartContainer
                title="Item drop distribution"
                subtitle={`Weighted by opens · ${range}`}
                kind="donut"
                height={280}
                loading
              />
            ) : donutSeries.length === 0 ? (
              <CasesPanelCard
                title="Item drop distribution"
                subtitle={`${range} · no data`}
              >
                <p className="text-sm text-zinc-500">
                  No item drops in this range yet.
                </p>
              </CasesPanelCard>
            ) : (
              <CasesChartContainer
                title="Item drop distribution"
                subtitle={`By drop count · ${range}`}
                kind="donut"
                height={280}
                donutSeries={donutSeries}
                donutLabels={donutLabels}
              />
            )}
          </div>

          <CasesPanelCard title="Most won items">
            {isPending ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="pb-2 font-medium">Item name</th>
                      <th className="pb-2 text-right font-medium">
                        Drop count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.mostWonItems.length ?? 0) === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="py-6 text-center text-zinc-500"
                        >
                          No opens in this range yet.
                        </td>
                      </tr>
                    ) : (
                      data!.mostWonItems.map((row) => (
                        <tr
                          key={row.name}
                          className="border-b border-zinc-800/60 last:border-0"
                        >
                          <td className="py-2.5 text-zinc-300">{row.name}</td>
                          <td className="py-2.5 text-right font-mono text-violet-300">
                            {row.dropCount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CasesPanelCard>
        </>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <CasesPanelCard>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-xl font-semibold text-zinc-100 ${loading ? "animate-pulse" : ""}`}
      >
        {value}
      </p>
    </CasesPanelCard>
  );
}
