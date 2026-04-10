"use client";

import { formatMoney } from "../../dice/components/formatMoney";
import { PanelCard } from "../../dice/components/PanelCard";
import { useTowersHistory } from "../hooks/useTowersHistory";
import { useCallback, useState } from "react";

export function HistorySection() {
  const [page, setPage] = useState(1);
  const [username, setUsername] = useState("");
  const [outcome, setOutcome] = useState<"all" | "won" | "lost" | "cashed_out">(
    "all",
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { loading, data, isError, errorMessage, reload } = useTowersHistory({
    page,
    limit: 20,
    username: username.trim() || undefined,
    outcome: outcome === "all" ? undefined : outcome,
    from: from.trim() || undefined,
    to: to.trim() || undefined,
  });

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.limit))
    : 1;

  const applyFilters = useCallback(() => {
    setPage(1);
    void reload();
  }, [reload]);

  return (
    <section id="history" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Game history</h2>
        <p className="text-sm text-zinc-500">
          Recent settled games with filters. Pagination is server-side.
        </p>
      </div>

      <PanelCard title="Filters" subtitle="User, outcome, date range (ISO optional)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs text-zinc-500">
            User contains
            <input
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Outcome
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={outcome}
              onChange={(e) =>
                setOutcome(e.target.value as typeof outcome)
              }
            >
              <option value="all">All</option>
              <option value="won">Win (full climb)</option>
              <option value="cashed_out">Cashout</option>
              <option value="lost">Loss</option>
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            From (ISO)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="2026-01-01T00:00:00.000Z"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            To (ISO)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyFilters()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setUsername("");
              setOutcome("all");
              setFrom("");
              setTo("");
              setPage(1);
              void reload();
            }}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Reset
          </button>
        </div>
      </PanelCard>

      {isError ? (
        <p className="text-sm text-rose-400">{errorMessage}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-left text-sm text-zinc-200">
          <thead className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Bet</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Mult</th>
              <th className="px-3 py-2">Profit</th>
              <th className="px-3 py-2">Diff / levels</th>
              <th className="px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : null}
            {!loading && data?.games.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  No rows
                </td>
              </tr>
            ) : null}
            {data?.games.map((g) => (
              <tr
                key={g.id}
                className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
              >
                <td className="px-3 py-2 font-mono text-xs">{g.userId}</td>
                <td className="px-3 py-2">{formatMoney(g.betAmount)}</td>
                <td className="px-3 py-2 capitalize">{g.outcome}</td>
                <td className="px-3 py-2">
                  {g.multiplier > 0 ? g.multiplier.toFixed(4) : "—"}
                </td>
                <td className="px-3 py-2">{formatMoney(g.profit)}</td>
                <td className="px-3 py-2 text-xs text-zinc-400">
                  {g.difficulty ?? "—"} / {g.levels ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-400">
                  {new Date(g.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span>
            Page {data.page} of {totalPages} · {data.total} games
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-zinc-700 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-700 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
