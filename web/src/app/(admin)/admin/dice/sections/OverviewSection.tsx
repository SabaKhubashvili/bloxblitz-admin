"use client";

import { ChartContainer } from "../components/ChartContainer";
import { StatCard } from "../components/StatCard";
import { formatCompact, formatMoney } from "../components/formatMoney";
import { TimeRangeToggle } from "../components/TimeRangeToggle";
import { useDiceOverview } from "../hooks/useDiceOverview";
import type { TimeRange } from "../mock/types";
import type { ApexOptions } from "apexcharts";

export function OverviewSection({
  range,
  onRangeChange,
}: {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  const {
    loading,
    isError,
    errorMessage,
    stats,
    rollBuckets,
    plSeries,
    betDist,
    reload,
  } = useDiceOverview(range);

  const distOpts: ApexOptions = {
    colors: ["#38bdf8"],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "72%",
      },
    },
    xaxis: {
      categories: rollBuckets.map((b) => b.label),
    },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (val: number) =>
          Number.isFinite(val) ? formatCompact(val) : String(val),
      },
    },
  };

  const plOpts: ApexOptions = {
    colors: ["#34d399"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: { categories: plSeries.map((d) => d.x) },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (val: number) => formatMoney(Number(val)),
      },
    },
  };

  const betOpts: ApexOptions = {
    colors: ["#60a5fa"],
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "55%",
        distributed: true,
      },
    },
    xaxis: {
      categories: betDist.map((d) => d.label),
    },
    legend: { show: false },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (val: number) =>
          Number.isFinite(val) ? formatCompact(val) : String(val),
      },
    },
  };

  return (
    <section id="overview" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Dice overview</h2>
          <p className="text-sm text-zinc-500">
            Live volume, house P/L, and distributions from DiceBet (UTC). Refreshes
            every ~25s.
          </p>
        </div>
        <TimeRangeToggle value={range} onChange={onRangeChange} />
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <p className="font-medium">Could not load dice analytics</p>
          <p className="mt-1 text-rose-200/90">{errorMessage ?? "Unknown error"}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-3 rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total rolls"
          value={stats ? formatCompact(stats.totalRolls) : "—"}
          loading={loading}
          hint={range}
        />
        <StatCard
          label="Total wagered"
          value={stats ? formatMoney(stats.totalWagered) : "—"}
          loading={loading}
        />
        <StatCard
          label="Profit / loss"
          value={stats ? formatMoney(stats.totalProfitLoss) : "—"}
          loading={loading}
        />
        <StatCard
          label="Active players"
          value={stats ? formatCompact(stats.activePlayers) : "—"}
          loading={loading}
        />
      </div>

      <ChartContainer
        title="Roll distribution"
        subtitle="Outcome buckets 0–100 (UTC window)"
        kind="bar"
        loading={loading}
        height={260}
        series={[{ name: "Rolls", data: rollBuckets.map((b) => b.count) }]}
        options={distOpts}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          title="Profit / loss over time"
          subtitle="House net per bucket (wagered − payouts)"
          loading={loading}
          series={[{ name: "P/L", data: plSeries.map((d) => d.y) }]}
          options={plOpts}
        />
        <ChartContainer
          title="Bet size distribution"
          subtitle="Count by stake band"
          kind="bar"
          loading={loading}
          height={280}
          series={[{ name: "Bets", data: betDist.map((d) => d.y) }]}
          options={betOpts}
        />
      </div>
    </section>
  );
}
