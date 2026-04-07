"use client";

import { Modal } from "@/components/ui/modal";
import { formatMoney } from "../components/formatMoney";
import { PanelCard } from "../components/PanelCard";
import { useDiceRecentGames } from "../hooks/useDiceRecentGames";
import { useTableSort } from "../hooks/useTableSort";
import type { DiceHistoryRow } from "../mock/types";
import { useMemo, useState } from "react";
import { cn } from "../components/cn";

export function HistorySection() {
  const [playerQ, setPlayerQ] = useState("");
  const [minBet, setMinBet] = useState("");
  const [side, setSide] = useState<"all" | "over" | "under">("all");
  const [detail, setDetail] = useState<DiceHistoryRow | null>(null);

  const { games, loading, isFetching, isError, errorMessage } =
    useDiceRecentGames({ player: playerQ, minBet, side });

  const getValue = useMemo(
    () => (row: DiceHistoryRow, col: string) => {
      switch (col) {
        case "id":
          return row.id;
        case "user":
          return row.username;
        case "bet":
          return row.betAmount;
        case "target":
          return row.targetValue;
        case "result":
          return row.rollResult;
        case "mult":
          return row.multiplier;
        case "pl":
          return row.profitLoss;
        case "time":
          return row.timestamp;
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
    { id: "id", label: "Roll ID" },
    { id: "user", label: "User" },
    { id: "bet", label: "Bet" },
    { id: "target", label: "Target" },
    { id: "result", label: "Result" },
    { id: "mult", label: "×" },
    { id: "pl", label: "P/L" },
    { id: "time", label: "Time" },
  ] as const;

  const filtersBusy = isFetching;
  const showInitialLoading = loading && games.length === 0;

  return (
    <section id="history" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Roll history</h2>
        <p className="text-sm text-zinc-500">
          Last 20 rolls from the server — filters apply on the backend. Sort
          stays in the browser.
        </p>
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {errorMessage ?? "Failed to load recent games."}
        </div>
      ) : null}

      <PanelCard flush>
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 lg:flex-row lg:flex-wrap">
          <input
            type="search"
            placeholder="Player…"
            value={playerQ}
            onChange={(e) => setPlayerQ(e.target.value)}
            disabled={filtersBusy}
            className="h-11 min-w-[160px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 disabled:opacity-50"
          />
          <input
            type="number"
            placeholder="Min bet"
            min={0}
            value={minBet}
            onChange={(e) => setMinBet(e.target.value)}
            disabled={filtersBusy}
            className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 font-mono lg:w-32 disabled:opacity-50"
          />
          <select
            value={side}
            onChange={(e) =>
              setSide(e.target.value as "all" | "over" | "under")
            }
            disabled={filtersBusy}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-200 lg:w-40 disabled:opacity-50"
          >
            <option value="all">All sides</option>
            <option value="over">Over only</option>
            <option value="under">Under only</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                {cols.map((c) => (
                  <th
                    key={c.id}
                    className="cursor-pointer px-3 py-3 hover:text-zinc-300"
                    onClick={() => onSort(c.id)}
                  >
                    <span className="inline-flex items-center gap-2">
                      {c.label}
                      {sortKey === c.id ? (
                        <span className="text-sky-400">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      ) : null}
                      {c.id === "time" && isFetching ? (
                        <span
                          className="inline-block size-3 animate-spin rounded-full border border-zinc-600 border-t-sky-400"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {showInitialLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Loading rolls…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No rolls match filters.
                  </td>
                </tr>
              ) : (
                sorted.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => setDetail(h)}
                    className="cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/40"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                      {h.id}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{h.username}</td>
                    <td className="px-3 py-2 font-mono text-zinc-200">
                      {formatMoney(h.betAmount)}
                    </td>
                    <td className="px-3 py-2 font-mono text-sky-300">
                      {h.side === "over" ? ">" : "<"} {h.targetValue.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-200">
                      {h.rollResult.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 font-mono text-sky-300">
                      {h.multiplier > 0 ? `${h.multiplier.toFixed(2)}×` : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 font-mono font-medium",
                        h.profitLoss >= 0
                          ? "text-emerald-400"
                          : "text-rose-400",
                      )}
                    >
                      {formatMoney(h.profitLoss)}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        {detail ? (
          <div className="p-6 pt-12">
            <h3 className="font-mono text-sky-200">{detail.id}</h3>
            <p className="mt-2 text-sm text-zinc-400">{detail.username}</p>
            <div className="mt-6 flex justify-center">
              <div
                className={cn(
                  "flex size-28 items-center justify-center rounded-2xl border-2 text-3xl font-bold tabular-nums shadow-lg",
                  detail.profitLoss >= 0
                    ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                    : "border-rose-500/50 bg-rose-950/40 text-rose-300",
                )}
              >
                {detail.rollResult.toFixed(2)}
              </div>
            </div>
            <dl className="mt-6 space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between">
                <dt>Side / target</dt>
                <dd className="font-mono text-zinc-200">
                  {detail.side === "over" ? "Over" : "Under"}{" "}
                  {detail.targetValue.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Bet</dt>
                <dd className="font-mono">{formatMoney(detail.betAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Multiplier</dt>
                <dd className="font-mono text-sky-300">
                  {detail.multiplier > 0
                    ? `${detail.multiplier.toFixed(2)}×`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>P/L</dt>
                <dd
                  className={cn(
                    "font-mono",
                    detail.profitLoss >= 0
                      ? "text-emerald-400"
                      : "text-rose-400",
                  )}
                >
                  {formatMoney(detail.profitLoss)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
