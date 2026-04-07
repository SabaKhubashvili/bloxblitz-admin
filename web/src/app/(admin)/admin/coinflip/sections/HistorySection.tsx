"use client";

import { Modal } from "@/components/ui/modal";
import type { CoinflipHistoryGame } from "@/lib/admin-api/coinflip-history";
import { formatMoney } from "../components/formatMoney";
import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { useCoinflipHistory } from "../hooks/useCoinflipHistory";
import { useTableSort } from "../hooks/useTableSort";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "../components/cn";

function playerCell(
  p: CoinflipHistoryGame["player1"],
  searchNeedle: string,
): ReactNode {
  if (!p) return "—";
  const label = `${p.username} · ${p.side}`;
  return <HighlightedText text={label} needle={searchNeedle} />;
}

function HighlightedText({ text, needle }: { text: string; needle: string }) {
  const q = needle.trim();
  if (!q) {
    return <span>{text}</span>;
  }
  let re: RegExp;
  try {
    re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  } catch {
    return <span>{text}</span>;
  }
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags);
  while ((m = r.exec(text)) !== null) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    out.push(
      <mark
        key={`${m.index}-${m[0]}`}
        className="rounded bg-amber-500/20 px-0.5 text-amber-100"
      >
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
    if (!r.global) break;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  return <span className="inline">{out}</span>;
}

export function HistorySection() {
  const [searchInput, setSearchInput] = useState("");
  const [minPotInput, setMinPotInput] = useState("");
  const [detail, setDetail] = useState<CoinflipHistoryGame | null>(null);

  const historyQuery = useCoinflipHistory(searchInput, minPotInput);
  const games = historyQuery.data?.games ?? [];
  const debouncedSearchForHighlight = historyQuery.debouncedSearch;
  const loadError =
    historyQuery.isError && historyQuery.error instanceof Error
      ? historyQuery.error.message
      : null;

  const getValue = useMemo(
    () => (row: CoinflipHistoryGame, col: string) => {
      switch (col) {
        case "id":
          return row.id;
        case "p1":
          return row.player1?.username ?? "";
        case "p2":
          return row.player2?.username ?? "";
        case "winner":
          return row.winner ?? "";
        case "pot":
          return row.totalWager;
        case "state":
          return row.state;
        case "time":
          return row.createdAt;
        default:
          return row.id;
      }
    },
    [],
  );

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    games,
    getValue,
    "time",
    "desc",
  );

  const cols = [
    { id: "id", label: "Game ID", sortable: true },
    { id: "p1", label: "Player 1", sortable: true },
    { id: "p2", label: "Player 2", sortable: true },
    { id: "winner", label: "Winner", sortable: true },
    { id: "pot", label: "Pot", sortable: true },
    { id: "state", label: "State", sortable: true },
    { id: "time", label: "Time", sortable: true },
  ] as const;

  const hasActiveFilters =
    searchInput.trim() !== "" || minPotInput.trim() !== "";

  const clearFilters = () => {
    setSearchInput("");
    setMinPotInput("");
  };

  return (
    <section id="history" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">History</h2>
        <p className="text-sm text-zinc-500">
          Latest 20 finished games from the database. Filters apply on the
          server (search substring on usernames, min total pot).
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <CoinflipPanelCard flush>
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <input
            type="search"
            placeholder="Search username (player 1 or 2)…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-11 min-w-[200px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Min pot"
            value={minPotInput}
            onChange={(e) => setMinPotInput(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 font-mono text-sm text-zinc-100 sm:w-36"
          />
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
            className="h-11 shrink-0 rounded-xl border border-zinc-600 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear filters
          </button>
        </div>
        {hasActiveFilters ? (
          <div className="flex flex-wrap gap-2 border-b border-zinc-800/80 bg-zinc-950/40 px-4 py-2 text-xs text-zinc-400">
            <span className="font-medium text-zinc-500">Active:</span>
            {searchInput.trim() ? (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-300">
                search: &quot;{searchInput.trim()}&quot;
              </span>
            ) : null}
            {minPotInput.trim() ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                minPot ≥ {minPotInput.trim()}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                {cols.map((c) => (
                  <th
                    key={c.id}
                    className={cn(
                      "px-3 py-3",
                      c.sortable && "cursor-pointer hover:text-zinc-300",
                    )}
                    onClick={() => c.sortable && onSort(c.id)}
                  >
                    {c.label}
                    {sortKey === c.id ? (
                      <span className="ml-1 text-sky-400">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {historyQuery.isPending && games.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Loading history…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No games match the filters.
                  </td>
                </tr>
              ) : (
                sorted.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => setDetail(h)}
                    className="cursor-pointer bg-zinc-900/30 transition-colors hover:bg-zinc-800/40"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                      {h.id}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {playerCell(h.player1, debouncedSearchForHighlight)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {playerCell(h.player2, debouncedSearchForHighlight)}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-emerald-400/90">
                      <HighlightedText
                        text={h.winner ?? "—"}
                        needle={debouncedSearchForHighlight}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-200">
                      {formatMoney(h.totalWager)}
                    </td>
                    <td className="px-3 py-2.5 capitalize text-sky-300">
                      {h.state}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-500">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CoinflipPanelCard>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        {detail ? (
          <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
            <h3 className="font-mono text-sky-300">{detail.id}</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Winner{" "}
              <span className="font-semibold text-emerald-400">
                {detail.winner ?? "—"}
              </span>
              {" · "}
              <span className="capitalize text-sky-300">
                {detail.state}
              </span>
            </p>
            <dl className="mt-4 space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between gap-4">
                <dt>Player 1</dt>
                <dd className="text-right text-zinc-200">
                  {detail.player1
                    ? `${detail.player1.username} (${detail.player1.side}) · ${formatMoney(detail.player1.wager)}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Player 2</dt>
                <dd className="text-right text-zinc-200">
                  {detail.player2
                    ? `${detail.player2.username} (${detail.player2.side}) · ${formatMoney(detail.player2.wager)}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Total pot</dt>
                <dd className="font-mono text-zinc-200">
                  {formatMoney(detail.totalWager)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Created</dt>
                <dd className="text-zinc-200">
                  {new Date(detail.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
