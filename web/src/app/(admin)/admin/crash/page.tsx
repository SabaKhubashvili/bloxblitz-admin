"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { cn } from "./components/cn";
import { ConfigurationSection } from "./sections/ConfigurationSection";
import { DebugSection } from "./sections/DebugSection";
import { LiveMonitoringSection } from "./sections/LiveMonitoringSection";
import { ManualControlsSection } from "./sections/ManualControlsSection";
import { OverviewSection } from "./sections/OverviewSection";
import { PlayersSection } from "./sections/PlayersSection";
import { RiskSection } from "./sections/RiskSection";
import { RoundHistorySection } from "./sections/RoundHistorySection";
import type { TimeRange } from "./mock/types";
import { useCrashControlRoomData } from "./hooks/useCrashControlRoomData";
import { useCrashMultiplierHistory } from "./hooks/useCrashMultiplierHistory";
import Link from "next/link";
import { useState } from "react";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#players", label: "Players" },
  { href: "#rounds", label: "Rounds" },
  { href: "#controls", label: "Controls" },
] as const;

export default function CrashAdminPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const showDebug = process.env.NODE_ENV === "development";

  const {
    loading,
    error,
    stats,
    profitLossHourly,
    actSeries,
  } = useCrashControlRoomData(range);

  const {
    loading: roundsLoading,
    error: roundsError,
    entries: multiplierHistory,
    multSeries,
  } = useCrashMultiplierHistory();

  return (
    <div>
      <PageBreadcrumb pageTitle="Crash · Overview" />

      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <header className="mb-6 flex flex-col gap-2 border-b border-gray-200 pb-6 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-500/90">
              Operations
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90 md:text-3xl">
              Crash overview & statistics
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              Metrics and charts from admin-api. Hash chain and server seeds are
              managed on the{" "}
              <Link
                href="/admin/crash/chain"
                className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
              >
                Crash chain
              </Link>{" "}
              page.
            </p>
          </div>
        </header>

        <nav
          className={cn(
            "sticky top-0 z-20 -mx-2 mb-8 overflow-x-auto border-b px-2 py-2 backdrop-blur-md md:-mx-0 md:px-0",
            "border-gray-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/80",
          )}
        >
          <ul className="px-1 flex min-w-max gap-1 md:flex-wrap">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100 md:text-sm"
                >
                  {item.label}
                </a>
              </li>
            ))}
            {showDebug ? (
              <li>
                <a
                  href="#debug"
                  className="block rounded-lg px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-500/90 dark:hover:bg-amber-500/10 md:text-sm"
                >
                  Debug
                </a>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="space-y-16 pb-4">
          <OverviewSection
            range={range}
            onRangeChange={setRange}
            loading={loading}
            error={error}
            stats={stats}
            multSeries={multSeries}
            profitLossHourly={profitLossHourly}
            actSeries={actSeries}
          />
          <PlayersSection />
          <RoundHistorySection
            entries={multiplierHistory}
            loading={roundsLoading}
            error={roundsError}
          />
          <ManualControlsSection />
          <DebugSection />
        </div>
      </div>
    </div>
  );
}
