"use client";

import { CoinflipChartContainer } from "../components/CoinflipChartContainer";
import { CoinflipStatCard } from "../components/CoinflipStatCard";
import { formatCompact, formatMoney } from "../components/formatMoney";
import { TimeRangeToggle } from "../components/TimeRangeToggle";
import { useCoinflipOverview } from "../hooks/useCoinflipOverview";
import type { TimeRange } from "../mock/types";
import type { ApexOptions } from "apexcharts";

interface OverviewSectionProps {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}

export function OverviewSection({
  range,
  onRangeChange,
}: OverviewSectionProps) {
  const { loading, stats, gamesSeries, wagerSeries, activitySeries } =
    useCoinflipOverview(range);

  const gOpts: ApexOptions = {
    colors: ["#38bdf8"],
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

  const wOpts: ApexOptions = {
    colors: ["#22c55e"],
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
    xaxis: { categories: wagerSeries.map((d) => d.x) },
  };

  const aOpts: ApexOptions = {
    colors: ["#60a5fa"],
    plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
    xaxis: { categories: activitySeries.map((d) => d.x) },
  };

  return (
    <section id="overview" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Overview</h2>
          <p className="text-sm text-zinc-500">
            1v1 coinflip volume and house take.
          </p>
        </div>
        <TimeRangeToggle value={range} onChange={onRangeChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CoinflipStatCard
          label="Total games"
          value={stats ? formatCompact(stats.totalGames) : "—"}
          loading={loading}
          hint={range}
        />
        <CoinflipStatCard
          label="Total wagered"
          value={stats ? formatMoney(stats.totalWagered) : "—"}
          loading={loading}
        />
        <CoinflipStatCard
          label="Platform profit"
          value={stats ? formatMoney(stats.platformProfit) : "—"}
          loading={loading}
        />
        <CoinflipStatCard
          label="Active games"
          value={stats ? String(stats.activeGamesCount) : "—"}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CoinflipChartContainer
          title="Games created"
          subtitle="Mock hourly creations"
          loading={loading}
          kind="area"
          series={[{ name: "Games", data: gamesSeries.map((d) => d.y) }]}
          options={gOpts}
        />
        <CoinflipChartContainer
          title="Wager volume"
          subtitle="Mock cumulative USD"
          loading={loading}
          kind="area"
          series={[{ name: "Wagered", data: wagerSeries.map((d) => d.y) }]}
          options={wOpts}
        />
      </div>
      <CoinflipChartContainer
        title="Player activity"
        subtitle="Unique matchers (mock)"
        loading={loading}
        kind="bar"
        height={260}
        series={[{ name: "Players", data: activitySeries.map((d) => d.y) }]}
        options={aOpts}
      />
    </section>
  );
}
