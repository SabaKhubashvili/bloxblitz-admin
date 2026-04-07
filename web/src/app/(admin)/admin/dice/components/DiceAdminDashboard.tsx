"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { cn } from "./cn";
import { AnalyticsSection } from "../sections/AnalyticsSection";
import { ConfigurationSection } from "../sections/ConfigurationSection";
import { DebugSection } from "../sections/DebugSection";
import { HistorySection } from "../sections/HistorySection";
import { LiveRollsSection } from "../sections/LiveRollsSection";
import { ManualControlsSection } from "../sections/ManualControlsSection";
import { OverviewSection } from "../sections/OverviewSection";
import { PlayerStatsSection } from "../sections/PlayerStatsSection";
import { RiskSection } from "../sections/RiskSection";
import type { TimeRange } from "../mock/types";
import { useState } from "react";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#live", label: "Live" },
  { href: "#history", label: "History" },
  { href: "#config", label: "Config" },
  { href: "#risk", label: "Risk" },
  { href: "#analytics", label: "Analytics" },
  { href: "#players", label: "Players" },
  { href: "#controls", label: "Controls" },
] as const;

export function DiceAdminDashboard() {
  const [range, setRange] = useState<TimeRange>("24h");
  const showDebug = process.env.NODE_ENV === "development";

  return (
    <div>
      <PageBreadcrumb pageTitle="Dice" />

      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <header className="mb-6 border-b border-gray-200 pb-6 dark:border-gray-800">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-600 dark:text-sky-400/90">
            Provably fair dice
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90 md:text-3xl">
            Dice admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Monitor dice traffic and risk. Overview and advanced analytics load
            from the admin API; live rolls and some moderation views may still
            use mock fixtures.
          </p>
        </header>

        <nav
          className={cn(
            "sticky top-0 z-20 -mx-2 mb-8 overflow-x-auto border-b px-2 py-2 backdrop-blur-md md:-mx-0 md:px-0",
            "border-gray-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/80"
          )}
        >
          <ul className="flex min-w-max gap-1 md:flex-wrap">
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

        <div className="space-y-16 pb-4 dark:text-inherit">
          <OverviewSection range={range} onRangeChange={setRange} />
          <HistorySection />
          <ConfigurationSection />
          <AnalyticsSection range={range} onRangeChange={setRange} />
          <PlayerStatsSection />
          <ManualControlsSection />
          <DebugSection />
        </div>
      </div>
    </div>
  );
}
