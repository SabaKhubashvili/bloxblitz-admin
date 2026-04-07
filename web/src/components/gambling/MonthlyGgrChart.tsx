"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { MoreDotIcon } from "@/icons";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useMemo, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useQuery } from "@tanstack/react-query";
import {
  fetchMonthlyGgrChart,
  monthlyGgrChartQueryKey,
} from "@/lib/queries/wagering-analytics";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

function formatUsd(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

/** `YYYY-MM` → short label in UTC (e.g. Mar ’25). */
function monthLabelUtc(ym: string) {
  const [ys, ms] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(ys, ms - 1, 1));
  return d.toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export default function MonthlyGgrChart() {
  const { data, isPending, isError } = useQuery({
    queryKey: monthlyGgrChartQueryKey,
    queryFn: () => fetchMonthlyGgrChart(12),
  });

  const categories = useMemo(
    () => data?.series.map((b) => monthLabelUtc(b.month)) ?? [],
    [data],
  );

  const ggrValues = useMemo(
    () =>
      data?.series.map((b) => {
        const n = Number(b.ggr);
        return Number.isFinite(n) ? n : 0;
      }) ?? [],
    [data],
  );

  const options: ApexOptions = useMemo(
    () => ({
      colors: ["#465fff"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "bar",
        height: 180,
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "39%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 4,
        colors: ["transparent"],
      },
      xaxis: {
        categories,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit",
      },
      yaxis: {
        title: {
          text: undefined,
        },
        labels: {
          formatter: (v) => {
            const n = typeof v === "number" ? v : Number(v);
            if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
            return formatUsd(n);
          },
        },
      },
      grid: {
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        x: {
          show: false,
        },
        y: {
          formatter: (val: number) => formatUsd(val),
        },
      },
    }),
    [categories],
  );

  const series = useMemo(
    () => [{ name: "GGR", data: ggrValues }],
    [ggrValues],
  );

  const [isOpen, setIsOpen] = useState(false);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const showChart = !isPending && !isError && categories.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Monthly GGR
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Gross gaming revenue (UTC months, settled bets)
            {data?.meta.timeZone
              ? ` · buckets: ${data.meta.timeZone}`
              : null}
          </p>
        </div>

        <div className="relative inline-block shrink-0">
          <button type="button" onClick={toggleDropdown} className="dropdown-toggle">
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
          <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="w-40 p-2"
          >
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View More
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {isPending && (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading chart…
        </p>
      )}
      {isError && (
        <p className="py-12 text-center text-sm text-error-500 dark:text-error-400">
          Could not load monthly GGR
        </p>
      )}
      {showChart && (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
            <ReactApexChart
              options={options}
              series={series}
              type="bar"
              height={180}
            />
          </div>
        </div>
      )}
    </div>
  );
}
