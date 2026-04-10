"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { cn } from "./cn";
import { ActiveGamesSection } from "../sections/ActiveGamesSection";
import { BotsSection } from "../sections/BotsSection";
import { ConfigurationSection } from "../sections/ConfigurationSection";
import { DebugSection } from "../sections/DebugSection";
import { DisputesSection } from "../sections/DisputesSection";
import { HistorySection } from "../sections/HistorySection";
import { LiveFeedSection } from "../sections/LiveFeedSection";
import { ManualControlsSection } from "../sections/ManualControlsSection";
import { OverviewSection } from "../sections/OverviewSection";
import { PlayerStatsSection } from "../sections/PlayerStatsSection";
import { RiskSection } from "../sections/RiskSection";
import { SuspiciousGamesSection } from "../sections/SuspiciousGamesSection";
import { SuspiciousUsersSection } from "../sections/SuspiciousUsersSection";
import type { TimeRange } from "../mock/types";
import { useState } from "react";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#active", label: "Active" },
  { href: "#history", label: "History" },
  { href: "#config", label: "Config" },
  { href: "#bots", label: "Bots" },
  { href: "#fraud-users", label: "Fraud users" },
  { href: "#fraud-games", label: "Fraud games" },
  { href: "#risk", label: "Risk" },
  { href: "#disputes", label: "Disputes" },
  { href: "#players", label: "Players" },
  { href: "#controls", label: "Controls" },
  { href: "#feed", label: "Live feed" },
] as const;

export function CoinflipAdminDashboard() {
  const [range, setRange] = useState<TimeRange>("24h");
  const showDebug = process.env.NODE_ENV === "development";

  return (
    <div>
      <PageBreadcrumb pageTitle="Coinflip" />

      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <header className="mb-6 flex flex-col gap-2 border-b border-gray-200 pb-6 dark:border-gray-800">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-600 dark:text-sky-400/90">
            1v1 PvP
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90 md:text-3xl">
            Coinflip admin
          </h1>
          <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Monitor heads/tails duels, economy limits, Redis-backed fraud signals,
            and disputes. Fraud sections call{" "}
            <span className="font-mono text-gray-600 dark:text-gray-500">
              /admin/coinflip/fraud/*
            </span>{" "}
            via the same admin proxy as the rest of the dashboard.
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

        <div className="space-y-16 pb-4">
          <OverviewSection range={range} onRangeChange={setRange} />
          <ActiveGamesSection />
          <HistorySection />
          <ConfigurationSection />
          <BotsSection />
          <SuspiciousUsersSection />
          <PlayerStatsSection />
          <ManualControlsSection />
        </div>
      </div>
    </div>
  );
}
