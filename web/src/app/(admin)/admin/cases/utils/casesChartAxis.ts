import type { ApexOptions } from "apexcharts";
import type { TimeRange } from "../mock/types";
import { formatCompact, formatMoney } from "../components/formatMoney";

export function formatCasesChartXLabel(raw: string, range: TimeRange): string {
  if (range === "24h") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      });
    }
    return raw;
  }
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dayMatch) {
    const y = Number(dayMatch[1]);
    const m = Number(dayMatch[2]);
    const day = Number(dayMatch[3]);
    const d = new Date(Date.UTC(y, m - 1, day));
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return raw;
}

function xAxisLayout(range: TimeRange): ApexOptions["xaxis"] {
  if (range === "24h") {
    return {
      tickAmount: 6,
      labels: { rotate: 0, maxHeight: 48 },
    };
  }
  if (range === "7d") {
    return {
      labels: { rotate: 0, maxHeight: 56 },
    };
  }
  return {
    labels: { rotate: -40, maxHeight: 72, style: { fontSize: "10px" } },
  };
}

export function buildOpeningsChartOptions(
  range: TimeRange,
  categories: string[],
): ApexOptions {
  return {
    colors: ["#a78bfa"],
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
    xaxis: {
      categories,
      title: {
        text: range === "24h" ? "Hour (UTC)" : "Date (UTC)",
        style: { color: "#71717a", fontSize: "11px", fontWeight: 500 },
      },
      ...xAxisLayout(range),
    },
    yaxis: {
      title: {
        text: "Opens",
        style: { color: "#71717a", fontSize: "11px", fontWeight: 500 },
      },
      labels: {
        formatter: (val: string | number) =>
          formatCompact(Number(val)),
      },
    },
    tooltip: {
      theme: "dark",
      x: { show: true },
      y: {
        formatter: (val: number) =>
          `${Math.round(val).toLocaleString()} opens`,
      },
    },
  };
}

export function buildRevenueChartOptions(
  range: TimeRange,
  categories: string[],
): ApexOptions {
  return {
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
    xaxis: {
      categories,
      title: {
        text: range === "24h" ? "Hour (UTC)" : "Date (UTC)",
        style: { color: "#71717a", fontSize: "11px", fontWeight: 500 },
      },
      ...xAxisLayout(range),
    },
    yaxis: {
      title: {
        text: "Revenue (USD)",
        style: { color: "#71717a", fontSize: "11px", fontWeight: 500 },
      },
      labels: {
        formatter: (val: string | number) => {
          const n = Number(val);
          return formatCompact(n);
        },
      },
    },
    tooltip: {
      theme: "dark",
      x: { show: true },
      y: {
        formatter: (val: number) => formatMoney(val),
      },
    },
  };
}
