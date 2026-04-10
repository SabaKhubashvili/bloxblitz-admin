"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { cn } from "../../dice/components/cn";
import { ConfigurationSection } from "../sections/ConfigurationSection";
import { HistorySection } from "../sections/HistorySection";
import { OverviewSection } from "../sections/OverviewSection";
import { OperatorSection } from "../sections/OperatorSection";
import { PlayerStatsSection } from "../sections/PlayerStatsSection";
import type { TimeRange } from "../../dice/mock/types";
import { useState } from "react";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#history", label: "Recent bets" },
  { href: "#config", label: "Config" },
  { href: "#players", label: "Players" },
  { href: "#operator", label: "Operator" },
] as const;

export function RouletteAdminDashboard() {
  const [range, setRange] = useState<TimeRange>("24h");

  return (
    <div>
      <PageBreadcrumb pageTitle="Roulette" />

      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <header className="mb-6 border-b border-gray-200 pb-6 dark:border-gray-800">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-amber-400/90">
            Multiplier wheel
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90 md:text-3xl">
            Roulette admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Monitor traffic, settled bets, and configuration. Analytics read from the
            database; live round state is read from Redis when the game server is connected.
          </p>
        </header>

        <nav
          className={cn(
            "sticky top-0 z-20 -mx-2 mb-8 overflow-x-auto border-b px-2 py-2 backdrop-blur-md md:-mx-0 md:px-0",
            "border-gray-200 bg-white/90 dark:border-gray-800 dark:bg-gray-900/80",
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
          </ul>
        </nav>

        <div className="space-y-16 pb-4 dark:text-inherit">
          <OverviewSection range={range} onRangeChange={setRange} />
          <HistorySection />
          <ConfigurationSection />
          <PlayerStatsSection />
          <OperatorSection />
        </div>
      </div>
    </div>
  );
}
