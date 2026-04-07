"use client";

import type { CrashProfitLossChartPoint } from "@/lib/admin-api/crash-control-room";
import { ChartContainer } from "../components/ChartContainer";
import { formatCompact, formatMoney } from "../components/formatMoney";
import { StatCard } from "../components/StatCard";
import { TimeRangeToggle } from "../components/TimeRangeToggle";
import type { MultiplierChartPoint } from "../hooks/useCrashMultiplierHistory";
import type { OverviewStats, TimeRange } from "../mock/types";
import type { ApexOptions } from "apexcharts";

interface OverviewSectionProps {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  loading: boolean;
  error: string | null;
  stats: OverviewStats | null;
  multSeries: MultiplierChartPoint[];
  profitLossHourly: CrashProfitLossChartPoint[];
  actSeries: MultiplierChartPoint[];
}

export function OverviewSection({
  range,
  onRangeChange,
  loading,
  error,
  stats,
  multSeries,
  profitLossHourly,
  actSeries,
}: OverviewSectionProps) {
  const multOptions: ApexOptions = {
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
    xaxis: { categories: multSeries.map((d) => d.x) },
  };

  const plCategories = profitLossHourly.map((d) => d.time);
  const plOptions: ApexOptions = {
    colors: ["#34d399", "#f43f5e"],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "65%",
      },
    },
    xaxis: { categories: plCategories },
    legend: {
      show: true,
      position: "top",
      labels: { colors: "#a1a1aa" },
    },
  };

  const actOptions: ApexOptions = {
    colors: ["#a78bfa"],
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: "55%" },
    },
    xaxis: { categories: actSeries.map((d) => d.x) },
  };

  return (
    <section id="overview" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Crash overview</h2>
          <p className="text-sm text-zinc-500">
            Live aggregates from admin-api · charts use last 24h (UTC hours) except
            multiplier trail (90 rounds).
          </p>
        </div>
        <TimeRangeToggle value={range} onChange={onRangeChange} />
      </div>

      {error ? (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total wagered"
          value={stats ? formatMoney(stats.totalWagered) : formatMoney(0)}
          loading={loading}
          hint={`Range: ${range}`}
          trend={{ label: "Crash · settled bets", positive: true }}
        />
        <StatCard
          label="Total paid out"
          value={
            stats?.totalPayout !== undefined
              ? formatMoney(stats.totalPayout)
              : formatMoney(0)
          }
          loading={loading}
          trend={{ label: "To players", positive: false }}
        />
        <StatCard
          label="Profit / loss"
          value={
            stats ? formatMoney(stats.totalProfitLoss) : formatMoney(0)
          }
          loading={loading}
          trend={{
            label: stats && stats.totalProfitLoss >= 0 ? "House up" : "House down",
            positive: stats ? stats.totalProfitLoss >= 0 : true,
          }}
        />
        <StatCard
          label="Active players"
          value={stats ? formatCompact(stats.activePlayers) : "—"}
          loading={loading}
        />
        <StatCard
          label="Total bets"
          value={stats ? formatCompact(stats.totalBetsCount) : "—"}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          title="Multiplier history"
          subtitle="Last 90 rounds · newest on the right"
          loading={loading}
          type="area"
          series={[{ name: "Crash @", data: multSeries.map((d) => d.y) }]}
          options={multOptions}
        />
        <ChartContainer
          title="Profit / loss"
          subtitle="House result by hour (UTC) · last 24h"
          loading={loading}
          type="bar"
          series={[
            {
              name: "House won",
              data: profitLossHourly.map((d) => d.profit),
            },
            {
              name: "House lost",
              data: profitLossHourly.map((d) => d.loss),
            },
          ]}
          options={plOptions}
        />
      </div>
      <ChartContainer
        title="Player activity"
        subtitle="Unique players per hour (UTC) · last 24h"
        loading={loading}
        type="bar"
        height={260}
        series={[{ name: "Players", data: actSeries.map((d) => d.y) }]}
        options={actOptions}
      />
    </section>
  );
}
