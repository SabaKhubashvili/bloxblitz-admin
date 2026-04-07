"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { CoinflipPanelCard } from "./CoinflipPanelCard";
import { Skeleton } from "./Skeleton";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-xl" />,
});

const DARK: Partial<ApexOptions> = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    background: "transparent",
  },
  grid: {
    borderColor: "#27272a",
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  xaxis: {
    labels: { style: { colors: "#71717a", fontSize: "11px" } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { colors: "#71717a", fontSize: "11px" } },
  },
  tooltip: { theme: "dark", x: { show: true } },
  dataLabels: { enabled: false },
};

export type CoinflipChartKind = "line" | "area" | "bar";

interface CoinflipChartContainerProps {
  title: string;
  subtitle?: string;
  kind?: CoinflipChartKind;
  series: { name?: string; data: (number | null)[] }[];
  options?: ApexOptions;
  height?: number;
  loading?: boolean;
  headerRight?: ReactNode;
}

export function CoinflipChartContainer({
  title,
  subtitle,
  kind = "area",
  series,
  options = {},
  height = 280,
  loading,
  headerRight,
}: CoinflipChartContainerProps) {
  if (loading) {
    return (
      <CoinflipPanelCard title={title} subtitle={subtitle} headerRight={headerRight}>
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </CoinflipPanelCard>
    );
  }

  const chartType = kind === "line" || kind === "area" ? kind : "bar";
  const merged: ApexOptions = {
    ...DARK,
    ...options,
    chart: {
      ...DARK.chart,
      ...options.chart,
      height,
      type: chartType,
    },
  };

  return (
    <CoinflipPanelCard
      title={title}
      subtitle={subtitle}
      flush
      headerRight={headerRight}
    >
      <div className="px-2 pb-2 pt-1">
        <ReactApexChart
          options={merged}
          series={series as never}
          type={chartType}
          height={height}
        />
      </div>
    </CoinflipPanelCard>
  );
}
