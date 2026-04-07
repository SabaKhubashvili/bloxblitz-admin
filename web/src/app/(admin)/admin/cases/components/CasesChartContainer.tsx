"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { CasesPanelCard } from "./CasesPanelCard";
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

export type CasesChartKind = "line" | "area" | "bar" | "donut";

interface CasesChartContainerProps {
  title: string;
  subtitle?: string;
  kind?: CasesChartKind;
  /** Axis charts */
  series?: { name?: string; data: (number | null)[] }[];
  options?: ApexOptions;
  height?: number;
  loading?: boolean;
  headerRight?: ReactNode;
  /** Donut */
  donutSeries?: number[];
  donutLabels?: string[];
}

export function CasesChartContainer({
  title,
  subtitle,
  kind = "area",
  series = [],
  options = {},
  height = 280,
  loading,
  headerRight,
  donutSeries,
  donutLabels,
}: CasesChartContainerProps) {
  if (loading) {
    return (
      <CasesPanelCard title={title} subtitle={subtitle} headerRight={headerRight}>
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </CasesPanelCard>
    );
  }

  if (kind === "donut" && donutSeries && donutLabels) {
    const donutOptions: ApexOptions = {
      ...DARK,
      ...options,
      chart: {
        ...DARK.chart,
        ...options.chart,
        height,
        type: "donut",
      },
      labels: donutLabels,
      legend: {
        position: "bottom",
        labels: { colors: "#a1a1aa" },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              name: { color: "#e4e4e7" },
              value: { color: "#f4f4f5" },
            },
          },
        },
      },
      stroke: { colors: ["#18181b"] },
    };
    return (
      <CasesPanelCard
        title={title}
        subtitle={subtitle}
        flush
        headerRight={headerRight}
      >
        <div className="px-2 pb-2 pt-1">
          <ReactApexChart
            options={donutOptions}
            series={donutSeries}
            type="donut"
            height={height}
          />
        </div>
      </CasesPanelCard>
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

  // ApexCharts v4: line strokes are tinted from `fill`; gradient fills with low
  // opacityTo can make the path effectively invisible. Area strokes also read
  // from `stroke.colors` — ensure both are explicit for dark UI line/area charts.
  if (kind === "line" || kind === "area") {
    const palette =
      Array.isArray(merged.colors) && merged.colors.length > 0
        ? merged.colors
        : ["#a78bfa"];
    const baseStroke = merged.stroke ?? {};
    const strokeWidth = baseStroke.width ?? 2;
    merged.stroke = {
      show: true,
      lineCap: "round",
      ...baseStroke,
      width: strokeWidth,
      colors: baseStroke.colors ?? palette,
    };
    if (kind === "line") {
      const baseFill = merged.fill ?? {};
      merged.fill = {
        ...baseFill,
        type: "solid",
        opacity: 1,
        colors: baseFill.colors ?? palette,
      };
    }
  }

  return (
    <CasesPanelCard
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
    </CasesPanelCard>
  );
}
