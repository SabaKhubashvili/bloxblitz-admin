"use client";

import Pagination from "@/components/tables/Pagination";
import {
  fetchRewardCasesList,
  fetchRewardOpens,
  type RewardOpenRowApi,
} from "@/lib/admin-api/reward-cases";
import { useCallback, useEffect, useState } from "react";
import { MinesPanelCard } from "../../mines/components/MinesPanelCard";

const PAGE_SIZE = 20;

function prizesText(row: RewardOpenRowApi): string {
  if (!row.prizes?.length) return "—";
  return row.prizes
    .map((p) => {
      const name = p.name ?? `Pet ${p.petId ?? "?"}`;
      const v = p.variant?.length ? ` [${p.variant.join(",")}]` : "";
      const val =
        p.value != null ? ` (value ${Math.round(p.value)})` : "";
      return `${name}${v}${val}`;
    })
    .join("; ");
}

export function RewardCaseOpensSection() {
  const [page, setPage] = useState(1);
  const [user, setUser] = useState("");
  const [debouncedUser, setDebouncedUser] = useState("");
  const [rewardCaseId, setRewardCaseId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"createdAt" | "userUsername">(
    "createdAt",
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [caseOptions, setCaseOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchRewardOpens>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedUser(user.trim()), 300);
    return () => window.clearTimeout(t);
  }, [user]);

  useEffect(() => {
    void fetchRewardCasesList({
      page: 1,
      pageSize: 200,
      sort: "position",
      order: "asc",
    }).then((r) =>
      setCaseOptions(r.items.map((i) => ({ id: i.id, title: i.title }))),
    );
  }, []);

  const load = useCallback(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void fetchRewardOpens(
      {
        page,
        pageSize: PAGE_SIZE,
        user: debouncedUser || undefined,
        rewardCaseId: rewardCaseId || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
        sort,
        order,
      },
      { signal: ac.signal },
    )
      .then((res) => {
        setData(res);
        const tp = Math.max(1, Math.ceil(res.total / res.pageSize));
        if (page > tp) setPage(tp);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(
          e instanceof Error ? e.message : "Failed to load case opens.",
        );
        setData(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [page, debouncedUser, rewardCaseId, from, to, sort, order]);

  useEffect(() => load(), [load]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="space-y-6">
      <MinesPanelCard
        title="Reward case opens"
        subtitle="Opened loyalty reward cases with rolled prizes. Filter by user, reward, or date."
      >
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              placeholder="Username…"
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setPage(1);
              }}
              className="min-w-[160px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <select
              value={rewardCaseId}
              onChange={(e) => {
                setRewardCaseId(e.target.value);
                setPage(1);
              }}
              className="min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">All rewards</option>
              {caseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="createdAt">Sort: time</option>
              <option value="userUsername">Sort: user</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as typeof order)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2.5">Time</th>
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5">Reward</th>
                    <th className="px-3 py-2.5">Prizes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-10 text-center text-zinc-500"
                      >
                        No opens match your filters.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr key={row.id} className="text-zinc-200">
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-400">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {row.userUsername}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-zinc-100">
                            {row.rewardCase.title}
                          </span>
                          <span className="ml-1 text-xs text-zinc-500">
                            {row.rewardCase.slug}
                          </span>
                        </td>
                        <td
                          className="max-w-[480px] px-3 py-2.5 text-xs text-zinc-400"
                          title={prizesText(row)}
                        >
                          {prizesText(row)}
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
              Page {page} of {totalPages} · {total.toLocaleString()} opens
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </MinesPanelCard>
    </section>
  );
}
