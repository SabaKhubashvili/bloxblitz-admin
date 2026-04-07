"use client";

import { MinesChartContainer } from "../components/MinesChartContainer";
import { MinesStatCard } from "../components/MinesStatCard";
import { formatCompact, formatMoney } from "../components/formatMoney";
import { TimeRangeToggle } from "../components/TimeRangeToggle";
import { useMinesAdmin } from "../context/MinesAdminContext";
import { useMinesOverview } from "../hooks/useMinesOverview";
import type { TimeRange } from "../mock/types";
import type { ApexOptions } from "apexcharts";

export function OverviewSection({
  range,
  onRangeChange,
}: {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  const { liveGames, history } = useMinesAdmin();
  const { loading, stats, gamesSeries, plSeries, multSeries } =
    useMinesOverview(range, liveGames.length, history.length);

  const gOpts: ApexOptions = {
    colors: ["#fbbf24"],
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
    xaxis: { categories: gamesSeries.map((d) => d.x) },
  };

  const plOpts: ApexOptions = {
    colors: ["#34d399"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: { categories: plSeries.map((d) => d.x) },
  };

  const mOpts: ApexOptions = {
    colors: ["#60a5fa"],
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: multSeries.map((d) => d.x) },
  };

  return (
    <section id="overview" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Mines overview</h2>
          <p className="text-sm text-zinc-500">
            Volume, house edge result, and engagement.
          </p>
        </div>
        <TimeRangeToggle value={range} onChange={onRangeChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MinesStatCard
          label="Games played"
          value={stats ? formatCompact(stats.totalGamesPlayed) : "—"}
          loading={loading}
          hint={range}
        />
        <MinesStatCard
          label="Total wagered"
          value={stats ? formatMoney(stats.totalWagered) : "—"}
          loading={loading}
        />
        <MinesStatCard
          label="Profit / loss"
          value={stats ? formatMoney(stats.totalProfitLoss) : "—"}
          loading={loading}
        />
        <MinesStatCard
          label="Active players"
          value={stats ? formatCompact(stats.activePlayers) : "—"}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MinesChartContainer
          title="Games played"
          subtitle="Mock hourly"
          loading={loading}
          series={[{ name: "Games", data: gamesSeries.map((d) => d.y) }]}
          options={gOpts}
        />
        <MinesChartContainer
          title="Profit / loss"
          subtitle="House cumulative (mock)"
          loading={loading}
          series={[{ name: "P/L", data: plSeries.map((d) => d.y) }]}
          options={plOpts}
        />
      </div>
      <MinesChartContainer
        title="Avg cashout multiplier"
        subtitle="Session averages (mock)"
        loading={loading}
        height={260}
        series={[{ name: "×", data: multSeries.map((d) => d.y) }]}
        options={mOpts}
      />
    </section>
  );
}
