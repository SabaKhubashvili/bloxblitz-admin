"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { cn } from "./cn";
import { ActivitySection } from "../sections/ActivitySection";
import { AnalyticsSection } from "../sections/AnalyticsSection";
import { CasesListSection } from "../sections/CasesListSection";
import { DebugSection } from "../sections/DebugSection";
import { LimitsSection } from "../sections/LimitsSection";
import { OverviewSection } from "../sections/OverviewSection";
import { QuickActionsSection } from "../sections/QuickActionsSection";
import type { CasesOverviewStats, TimeRange } from "../mock/types";
import { useCasesAdmin } from "../context/CasesAdminContext";
import { useEffect, useState } from "react";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#cases-list", label: "Cases" },
  { href: "#limits", label: "Limits" },
  { href: "#analytics", label: "Analytics" },
  { href: "#activity", label: "Activity" },
  { href: "#quick", label: "Quick actions" },
] as const;

interface CasesAdminDashboardProps {
  initialCaseId?: string;
  initialCasesOverview?: CasesOverviewStats | null;
  /** Open the create-case modal after navigating to `/admin/cases/new`. */
  openCreateOnMount?: boolean;
}

export function CasesAdminDashboard({
  initialCaseId,
  initialCasesOverview = null,
  openCreateOnMount = false,
}: CasesAdminDashboardProps) {
  const [range, setRange] = useState<TimeRange>("24h");
  const { cases } = useCasesAdmin();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const showDebug = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (cases.length === 0) {
      setSelectedCaseId(null);
      return;
    }
    setSelectedCaseId((prev) => {
      if (initialCaseId && cases.some((c) => c.id === initialCaseId)) {
        return initialCaseId;
      }
      if (prev && cases.some((c) => c.id === prev)) return prev;
      return cases[0].id;
    });
  }, [cases, initialCaseId]);

  useEffect(() => {
    if (!initialCaseId) return;
    const el = document.getElementById("analytics");
    window.requestAnimationFrame(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [initialCaseId]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Cases" />

      <div className="min-h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <header className="mb-6 flex flex-col gap-2 border-b border-gray-200 pb-6 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400/90">
              Loot operations
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90 md:text-3xl">
              Cases admin
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              Manage loot boxes, odds, and limits. Overview, charts, and case
              analytics load from admin-api; list editing still syncs to mock
              context where not yet wired.
            </p>
          </div>
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
          <OverviewSection
            range={range}
            onRangeChange={setRange}
            initialCasesOverview={initialCasesOverview}
          />
          <CasesListSection openCreateOnMount={openCreateOnMount} />
          <AnalyticsSection
            selectedCaseId={selectedCaseId}
            onSelectCase={setSelectedCaseId}
          />
          <ActivitySection />
          <QuickActionsSection />
          <DebugSection />
        </div>
      </div>
    </div>
  )
}
