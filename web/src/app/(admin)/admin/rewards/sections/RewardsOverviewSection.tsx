"use client";

import Pagination from "@/components/tables/Pagination";
import type { RewardCaseSummaryApi } from "@/lib/admin-api/reward-cases";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MinesPanelCard } from "../../mines/components/MinesPanelCard";
import { cn } from "../../mines/components/cn";
import { RewardCaseEditModal } from "../components/RewardCaseEditModal";
import { useRewardCasesList } from "../hooks/useRewardCases";

const PAGE_SIZE = 15;

function prizeSummary(r: RewardCaseSummaryApi): string {
  if (r.prizes.length === 0) return "—";
  return r.prizes
    .slice(0, 5)
    .map((p) => `${p.pet.name} (${p.weight})`)
    .join(", ");
}

export function RewardsOverviewSection() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<
    "position" | "title" | "slug" | "createdAt" | "updatedAt"
  >("position");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => {
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const { data, isLoading, isError, error, isFetching } = useRewardCasesList({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    status,
    sort,
    order,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="space-y-6">
      <MinesPanelCard
        title="Rewards overview"
        subtitle="Level and milestone reward cases, pool prizes, and activation status. Configure wagering and prizes on the configuration page."
      >
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              placeholder="Search title or slug…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="position">Sort: position</option>
              <option value="title">Sort: title</option>
              <option value="slug">Sort: slug</option>
              <option value="createdAt">Sort: created</option>
              <option value="updatedAt">Sort: updated</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
              className="rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <Link
              href="/admin/rewards/config"
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Open configuration
            </Link>
          </div>

          {isError ? (
            <p className="text-sm text-rose-400">
              {error instanceof Error
                ? error.message
                : "Failed to load reward cases."}
            </p>
          ) : isLoading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <div
              className={cn(
                "overflow-x-auto rounded-xl border border-zinc-800 transition-opacity",
                isFetching && "opacity-60",
              )}
            >
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2.5">Title</th>
                    <th className="px-3 py-2.5">Slug</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Wager keys</th>
                    <th className="px-3 py-2.5">Prizes</th>
                    <th className="px-3 py-2.5">Pos</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-10 text-center text-zinc-500"
                      >
                        No reward cases match your filters.
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.id} className="text-zinc-200">
                        <td className="max-w-[220px] truncate px-3 py-2.5 font-medium">
                          {r.title}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                          {r.slug}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              r.isActive
                                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                                : "border border-zinc-600 bg-zinc-800/60 text-zinc-400",
                            )}
                          >
                            {r.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-zinc-400">
                          {r.receivesWagerKeys ? (
                            <span>
                              1 key / {r.wagerCoinsPerKey} coins (max{" "}
                              {r.wagerKeysMaxPerEvent}/event)
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          className="max-w-[320px] px-3 py-2.5 text-xs text-zinc-400"
                          title={r.prizes.map((p) => p.pet.name).join(", ")}
                        >
                          {prizeSummary(r)}
                          {r.prizes.length > 5 ? "…" : ""}
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400">
                          {r.position}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingId(r.id)}
                            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-violet-300"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages} · {total.toLocaleString()} total
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </MinesPanelCard>

      {editingId && (
        <RewardCaseEditModal
          caseId={editingId}
          onClose={() => setEditingId(null)}
        />
      )}
    </section>
  );
}
