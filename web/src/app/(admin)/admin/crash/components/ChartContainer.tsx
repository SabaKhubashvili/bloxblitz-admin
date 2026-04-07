"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { CrashCard } from "./CrashCard";
import { Skeleton } from "./Skeleton";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-xl" />,
});

const DARK_CHART: Partial<ApexOptions> = {
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
    labels: {
      style: { colors: "#71717a", fontSize: "11px" },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: "#71717a", fontSize: "11px" },
    },
  },
  tooltip: {
    theme: "dark",
    x: { show: true },
  },
  dataLabels: { enabled: false },
};

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  series: { name?: string; data: (number | null)[] }[];
  options: ApexOptions;
  type?: "line" | "area" | "bar";
  height?: number;
  loading?: boolean;
  headerRight?: ReactNode;
}

export function ChartContainer({
  title,
  subtitle,
  series,
  options,
  type = "area",
  height = 280,
  loading,
  headerRight,
}: ChartContainerProps) {
  if (loading) {
    return (
      <CrashCard title={title} subtitle={subtitle} headerRight={headerRight}>
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </CrashCard>
    );
  }

  const merged: ApexOptions = {
    ...DARK_CHART,
    ...options,
    chart: {
      ...DARK_CHART.chart,
      ...options.chart,
      height,
      type,
    },
  };

  return (
    <CrashCard
      title={title}
      subtitle={subtitle}
      flush
      headerRight={headerRight}
    >
      <div className="px-2 pb-2 pt-1">
        <ReactApexChart
          options={merged}
          series={series as never}
          type={type}
          height={height}
        />
      </div>
    </CrashCard>
  );
}
