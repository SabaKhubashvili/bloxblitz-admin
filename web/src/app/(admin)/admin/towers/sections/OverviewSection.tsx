"use client";

import { ChartContainer } from "../../dice/components/ChartContainer";
import { StatCard } from "../../dice/components/StatCard";
import { formatCompact, formatMoney } from "../../dice/components/formatMoney";
import { TowersTimeRangeToggle } from "../components/TowersTimeRangeToggle";
import { useTowersOverview } from "../hooks/useTowersOverview";
import type { TowersTimeRange } from "../types";
import type { ApexOptions } from "apexcharts";

export function OverviewSection({
  range,
  onRangeChange,
}: {
  range: TowersTimeRange;
  onRangeChange: (r: TowersTimeRange) => void;
}) {
  const { loading, isError, errorMessage, data, reload } =
    useTowersOverview(range);

  const stats = data?.stats;
  const gamesSeries = data?.charts.gamesPlayed ?? [];
  const plSeries = data?.charts.profitLoss ?? [];
  const multSeries = data?.charts.avgMultiplier ?? [];

  const gamesOpts: ApexOptions = {
    colors: ["#c084fc"],
    stroke: { curve: "smooth", width: 3, colors: ["#c084fc"] },
    /** Subtle area only — do not use `fill: { opacity: 0 }` (Apex hides the line). */
    xaxis: { categories: gamesSeries.map((d) => d.x) },
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
    stroke: { curve: "smooth", width: 3, colors: ["#34d399"] },
    fill: {
      type: "gradient",
    },
    xaxis: { categories: plSeries.map((d) => d.x) },
    tooltip: {
      theme: "dark",
      y: { formatter: (val: number) => formatMoney(Number(val)) },
    },
  };

  const multOpts: ApexOptions = {
    colors: ["#38bdf8"],
    stroke: { curve: "smooth", width: 3, colors: ["#38bdf8"] },
    xaxis: { categories: multSeries.map((d) => d.x) },
    tooltip: { theme: "dark" },
  };

  return (
    <section id="overview" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Overview</h2>
          <p className="text-sm text-zinc-500">
            Settled Towers rounds from <code className="text-zinc-400">GameHistory</code>{" "}
            (UTC). Cached ~45s server-side; this view refetches on an interval.
          </p>
          {data?.chartNote ? (
            <p className="mt-1 text-xs text-amber-200/80">{data.chartNote}</p>
          ) : null}
        </div>
        <TowersTimeRangeToggle value={range} onChange={onRangeChange} />
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <p className="font-medium">Could not load Towers overview</p>
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
          label="Total games played"
          value={stats ? formatCompact(stats.totalGamesPlayed) : "—"}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          title="Games played"
          subtitle="Settled rounds per bucket (UTC)"
          kind="line"
          loading={loading}
          series={[{ name: "Games", data: gamesSeries.map((d) => d.y) }]}
          options={gamesOpts}
        />
        <ChartContainer
          title="Profit / loss"
          subtitle="House result per bucket (player profit summed negatively)"
          kind="line"
          loading={loading}
          series={[{ name: "P/L", data: plSeries.map((d) => d.y) }]}
          options={plOpts}
        />
      </div>

      <ChartContainer
        title="Avg multiplier (cashouts & wins)"
        subtitle="Mean multiplier where the round ended in a win or cashout"
        kind="line"
        loading={loading}
        series={[{ name: "Avg mult", data: multSeries.map((d) => d.y) }]}
        options={multOpts}
      />
    </section>
  );
}
