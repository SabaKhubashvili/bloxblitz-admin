"use client";

import { CalenderIcon } from "@/icons";
import {
  fetchStatisticsChart,
  statisticsChartQueryKey,
  type StatisticsChartFetchParams,
  type StatisticsChartGranularity,
  type StatisticsChartPreset,
} from "@/lib/queries/statistics-chart";
import { useQuery } from "@tanstack/react-query";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type flatpickr from "flatpickr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PRESETS = [
  { id: "24h" as const, label: "24h" },
  { id: "7d" as const, label: "7d" },
  { id: "30d" as const, label: "30d" },
  { id: "1y" as const, label: "1y" },
];
type PresetId = (typeof PRESETS)[number]["id"];

function formatUsdAxis(val: number) {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCategoryLabel(iso: string, granularity: StatisticsChartGranularity) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (granularity === "hour") {
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      timeZone: "UTC",
    });
  }
  if (granularity === "day") {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return d.toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function utcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeForPreset(preset: StatisticsChartPreset, now: Date): [Date, Date] {
  const to = new Date(now.getTime());
  let from: Date;
  switch (preset) {
    case "24h":
      from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return [from, to];
}

export default function StatisticsChart() {
  const datePickerRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const [pickerReady, setPickerReady] = useState(false);
  const [preset, setPreset] = useState<PresetId>("7d");
  const [fetchParams, setFetchParams] = useState<StatisticsChartFetchParams>({
    kind: "preset",
    preset: "7d",
  });

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: statisticsChartQueryKey(fetchParams),
    queryFn: () => fetchStatisticsChart(fetchParams),
  });

  const applyPreset = useCallback((p: PresetId) => {
    setPreset(p);
    setFetchParams({ kind: "preset", preset: p });
    const [from, to] = rangeForPreset(p, new Date());
    fpRef.current?.setDate([from, to], false);
  }, []);

  const applyCustomRange = useCallback((from: Date, to: Date) => {
    setFetchParams({
      kind: "custom",
      startDate: utcYmd(from),
      endDate: utcYmd(to),
    });
  }, []);

  useEffect(() => {
    const el = datePickerRef.current;
    if (!el) return;

    const [from0, to0] = rangeForPreset("7d", new Date());
    let destroyed = false;
    let instance: flatpickr.Instance | null = null;

    void import("flatpickr").then(({ default: flatpickr }) => {
      if (destroyed || !datePickerRef.current) return;
      instance = flatpickr(el, {
        mode: "range",
        static: true,
        monthSelectorType: "static",
        dateFormat: "Y-m-d",
        defaultDate: [from0, to0],
        clickOpens: true,
        prevArrow:
          '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        nextArrow:
          '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        onChange: (dates) => {
          if (dates.length === 2 && dates[0] && dates[1]) {
            applyCustomRange(dates[0], dates[1]);
          }
        },
      });
      fpRef.current = instance;
      setPickerReady(true);
    });

    return () => {
      destroyed = true;
      setPickerReady(false);
      instance?.destroy();
      fpRef.current = null;
    };
  }, [applyCustomRange]);

  useEffect(() => {
    if (!pickerReady || fetchParams.kind !== "preset") return;
    const [from, to] = rangeForPreset(fetchParams.preset, new Date());
    fpRef.current?.setDate([from, to], false);
  }, [fetchParams, pickerReady]);

  const granularity = data?.meta.granularity ?? "day";

  const categories = useMemo(
    () =>
      data?.series.map((row) =>
        formatCategoryLabel(row.date, granularity),
      ) ?? [],
    [data, granularity],
  );

  const series = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: "Total wagered",
        data: data.series.map((r) => Number(r.totalWagered) || 0),
      },
      {
        name: "Total payout",
        data: data.series.map((r) => Number(r.totalPaidOut) || 0),
      },
      {
        name: "Total user loss",
        data: data.series.map((r) => Number(r.totalUserLoss) || 0),
      },
    ];
  }, [data]);

  const options: ApexOptions = useMemo(
    () => ({
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontSize: "13px",
        markers: { size: 5 },
      },
      colors: ["#465FFF", "#10B981", "#F59E0B"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        height: 310,
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: "smooth",
        width: [2, 2, 2],
      },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.35,
          opacityTo: 0.05,
        },
      },
      markers: {
        size: 0,
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: { size: 5 },
      },
      grid: {
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      dataLabels: { enabled: false },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (v) =>
            typeof v === "number" && Number.isFinite(v)
              ? formatUsdAxis(v)
              : "—",
        },
      },
      xaxis: {
        type: "category",
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          rotate: categories.length > 14 ? -45 : 0,
          rotateAlways: categories.length > 14,
          style: { fontSize: "11px" },
        },
      },
      yaxis: {
        labels: {
          formatter: formatUsdAxis,
          style: { fontSize: "12px", colors: ["#6B7280"] },
        },
        title: { text: undefined },
      },
    }),
    [categories],
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between sm:items-start">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Wagering statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Settled bets only — wagered, paid out, and net user loss (UTC).
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end w-full">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-2 rounded-md text-theme-sm font-medium transition-colors ${
                  fetchParams.kind === "preset" && preset === p.id
                    ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="relative inline-flex items-center">
            <CalenderIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-3 lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
            <input
              ref={datePickerRef}
              className="h-10 w-10 lg:w-44 lg:h-auto lg:pl-10 lg:pr-3 lg:py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-transparent lg:text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:lg:text-gray-300 cursor-pointer"
              placeholder="Custom range"
              readOnly
            />
          </div>
        </div>
      </div>

      {isError && (
        <p className="mb-4 text-sm text-error-600 dark:text-error-400">
          {error instanceof Error ? error.message : "Could not load chart."}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </p>
      )}

      <div className="max-w-full ">
        <div className="min-w-[1200px] xl:min-w-full">
          {isPending || !data ? (
            <div
              className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 text-gray-500 text-sm"
              style={{ height: 310 }}
            >
              Loading chart…
            </div>
          ) : (
            <Chart
              options={options}
              series={series}
              type="area"
              height={310}
            />
          )}
        </div>
      </div>
    </div>
  );
}
