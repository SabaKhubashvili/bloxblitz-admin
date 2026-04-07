"use client";

import { MinesChartContainer } from "../components/MinesChartContainer";
import { MinesPanelCard } from "../components/MinesPanelCard";
import { useMinesAdmin } from "../context/MinesAdminContext";
import { mineCountHistogram, riskDistribution } from "../mock/data";
import type { ApexOptions } from "apexcharts";
import { useMemo } from "react";

export function AnalyticsSection() {
  const { history } = useMinesAdmin();
  const mineHist = useMemo(() => mineCountHistogram(history), [history]);
  const risk = riskDistribution();

  const barMine: ApexOptions = {
    colors: ["#fbbf24"],
    plotOptions: { bar: { borderRadius: 6, horizontal: false } },
    xaxis: { categories: mineHist.map((d) => d.label) },
  };

  const barRisk: ApexOptions = {
    colors: ["#34d399", "#fbbf24", "#f87171"],
    plotOptions: { bar: { borderRadius: 6, distributed: true } },
    xaxis: { categories: risk.map((d) => d.label) },
  };

  const tileOpts: ApexOptions = {
    colors: ["#60a5fa"],
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: Array.from({ length: 12 }, (_, i) => `${i + 1} tiles`),
    },
  };
  const tileData = Array.from(
    { length: 12 },
    (_, i) => Math.round(8 + Math.random() * 42 + (12 - i) * 2)
  );

  const cashOpts: ApexOptions = {
    colors: ["#a3e635"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: { categories: Array.from({ length: 18 }, (_, i) => `S${i + 1}`) },
  };
  const cashData = Array.from({ length: 18 }, (_, i) =>
    Math.round(20 + Math.random() * 30 + Math.sin(i / 2) * 8)
  );

  return (
    <section id="analytics" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Advanced analytics
        </h2>
        <p className="text-sm text-zinc-500">
          Derived from history + static risk mix (mock).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MinesPanelCard title="Avg session length">
          <p className="font-mono text-3xl font-semibold text-sky-300">
            4m 12s
          </p>
          <p className="mt-1 text-xs text-zinc-500">Simulated aggregate</p>
        </MinesPanelCard>
        <MinesPanelCard title="Top mine preset">
          <p className="font-mono text-3xl font-semibold text-amber-300">
            3 mines
          </p>
          <p className="mt-1 text-xs text-zinc-500">From histogram below</p>
        </MinesPanelCard>
        <MinesPanelCard title="Risk posture">
          <p className="text-sm text-zinc-400">
            Low-heavy sessions in mock cohort.
          </p>
        </MinesPanelCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MinesChartContainer
          title="Mine count frequency"
          subtitle="From recent history rows"
          kind="bar"
          height={260}
          series={[{ name: "Games", data: mineHist.map((d) => d.value) }]}
          options={barMine}
        />
        <MinesChartContainer
          title="Risk distribution"
          subtitle="Low / medium / high (mock %)"
          kind="bar"
          height={260}
          series={[{ name: "%", data: risk.map((d) => d.value) }]}
          options={barRisk}
        />
      </div>

      <MinesChartContainer
        title="Tile reveal patterns"
        subtitle="How far players push before cashout (mock)"
        kind="area"
        height={260}
        series={[{ name: "Sessions", data: tileData }]}
        options={tileOpts}
      />
      <MinesChartContainer
        title="Cashout behaviour"
        subtitle="% sessions cashing at depth (mock)"
        kind="area"
        height={260}
        series={[{ name: "Rate", data: cashData }]}
        options={cashOpts}
      />
    </section>
  );
}
