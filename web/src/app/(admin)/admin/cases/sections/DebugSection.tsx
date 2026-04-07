"use client";

import { CasesPanelCard } from "../components/CasesPanelCard";
import { CaseInputField } from "../components/CaseInputField";
import { CaseSelect } from "../components/CaseSelect";
import {
  fetchCasesList,
  type CaseListItemApi,
} from "@/lib/admin-api/cases-list";
import { useCasesAdmin } from "../context/CasesAdminContext";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const DEBUG_LIST_PAGE_SIZE = 500;

export function DebugSection() {
  const { casesListVersion } = useCasesAdmin();
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminCasesDebugList", casesListVersion] as const,
    queryFn: () =>
      fetchCasesList({
        page: 1,
        pageSize: DEBUG_LIST_PAGE_SIZE,
        status: "all",
      }),
    enabled: process.env.NODE_ENV === "development",
    staleTime: 60_000,
  });

  const cases: CaseListItemApi[] = data?.cases ?? [];

  const [opens, setOpens] = useState("12");
  const [forceItemId, setForceItemId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (cases.length === 0) {
      setCaseId("");
      return;
    }
    if (!caseId || !cases.some((c) => c.id === caseId)) {
      setCaseId(cases[0].id);
    }
  }, [cases, caseId]);

  const itemOptions = useMemo(() => {
    const c = cases.find((x) => x.id === caseId);
    if (!c?.caseItems?.length) {
      return [{ value: "", label: "—" }];
    }
    return c.caseItems.map((i) => ({
      value: i.id,
      label: `${i.name} (${i.dropChance.toFixed(2)}%)`,
    }));
  }, [cases, caseId]);

  useEffect(() => {
    if (!forceItemId) return;
    const c = cases.find((x) => x.id === caseId);
    const ids = c?.caseItems?.map((i) => i.id) ?? [];
    if (!ids.includes(forceItemId)) {
      setForceItemId("");
    }
  }, [cases, caseId, forceItemId]);

  if (process.env.NODE_ENV !== "development") return null;

  const selectedCase = cases.find((c) => c.id === caseId);
  const selectedItem = selectedCase?.caseItems?.find(
    (i) => i.id === forceItemId,
  );

  return (
    <section id="debug" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-amber-200/90">Debug</h2>
        <p className="text-sm text-zinc-500">
          Development-only helpers. Case list is loaded from admin-api (up to{" "}
          {DEBUG_LIST_PAGE_SIZE} rows).
        </p>
      </div>

      {isError ? (
        <CasesPanelCard title="Catalog load failed" className="border-red-900/40">
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
          >
            Retry
          </button>
        </CasesPanelCard>
      ) : null}

      {banner ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-300">
          {banner}
        </div>
      ) : null}

      <CasesPanelCard
        title="Simulation"
        className="border-amber-900/30"
      >
        {isPending ? (
          <p className="text-sm text-zinc-500">Loading cases from API…</p>
        ) : null}

        {!isPending && !isError && cases.length === 0 ? (
          <p className="text-sm text-zinc-500">No cases in the database.</p>
        ) : null}

        {!isPending && cases.length > 0 ? (
          <>
            {data != null && data.total > cases.length ? (
              <p className="mb-4 text-xs text-amber-200/80">
                Showing {cases.length} of {data.total} cases (increase page size
                in code if you need more in debug).
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const n = Number(opens) || 0;
                  setBanner(`[mock] Simulated ${n} openings — see console.`);
                  console.info("[cases-admin dev] simulateOpenings", {
                    count: n,
                    caseId,
                    slug: selectedCase?.slug,
                  });
                }}
                className="rounded-xl border border-amber-600/50 bg-amber-600/15 px-4 py-2 text-sm font-medium text-amber-200"
              >
                Simulate openings
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <CaseSelect
                id="debug-case"
                label="Case"
                value={caseId}
                onChange={(id) => {
                  setCaseId(id);
                  setForceItemId("");
                }}
                options={cases.map((c) => ({
                  value: c.id,
                  label: `${c.name} · ${c.slug}`,
                }))}
              />
              <CaseSelect
                id="debug-item"
                label="Force drop item (catalog)"
                value={forceItemId}
                onChange={setForceItemId}
                options={itemOptions}
              />
              <CaseInputField
                id="debug-opens"
                label="Batch size"
                type="number"
                value={opens}
                onChange={setOpens}
                min="1"
              />
            </div>

            <button
              type="button"
              className="mt-4 text-sm text-violet-400 hover:underline"
              onClick={() => {
                setBanner(
                  `[mock] forceDrop caseId=${caseId} slug=${selectedCase?.slug ?? "—"} itemId=${forceItemId || "(none)"} item=${selectedItem?.name ?? "—"}`,
                );
                console.info("[cases-admin dev] forceDrop", {
                  caseId,
                  slug: selectedCase?.slug,
                  itemId: forceItemId || null,
                  itemName: selectedItem?.name ?? null,
                  dropChance: selectedItem?.dropChance ?? null,
                });
              }}
            >
              Log probability test payload
            </button>
          </>
        ) : null}
      </CasesPanelCard>
    </section>
  );
}
