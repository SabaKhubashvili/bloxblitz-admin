"use client";

import { formatMoney } from "../../dice/components/formatMoney";
import { PanelCard } from "../../dice/components/PanelCard";
import { useRouletteRecentBets } from "../hooks/useRouletteRecentBets";
import { useTableSort } from "../../dice/hooks/useTableSort";
import type { RouletteRecentBetRow } from "@/lib/admin-api/roulette-recent-bets";
import { useMemo, useState } from "react";
import { cn } from "../../dice/components/cn";

function outcomeLabel(row: RouletteRecentBetRow): string {
  if (row.status === "WON" && row.multiplier != null && row.multiplier > 0) {
    if (Math.abs(row.multiplier - 14.7) < 0.05) return "GREEN";
    return "BROWN/YELLOW";
  }
  if (row.status === "LOST") return "—";
  return row.status;
}

export function HistorySection() {
  const [playerQ, setPlayerQ] = useState("");
  const { bets, loading, isFetching, isError, errorMessage } =
    useRouletteRecentBets({ player: playerQ, limit: 40 });

  const getValue = useMemo(
    () => (row: RouletteRecentBetRow, col: string) => {
      switch (col) {
        case "user":
          return row.username;
        case "bet":
          return row.betAmount;
        case "outcome":
          return outcomeLabel(row);
        case "mult":
          return row.multiplier ?? 0;
        case "pl":
          return row.profit ?? 0;
        case "time":
          return row.createdAt;
        default:
          return row.id;
      }
    },
    [],
  );

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    bets,
    getValue,
    "time",
    "desc",
  );

  const cols = [
    { id: "user", label: "User" },
    { id: "bet", label: "Bet" },
    { id: "outcome", label: "Result" },
    { id: "mult", label: "×" },
    { id: "pl", label: "P/L" },
    { id: "time", label: "Time" },
  ] as const;

  const filtersBusy = isFetching;
  const showInitialLoading = loading && bets.length === 0;

  return (
    <section id="history" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Recent bets</h2>
        <p className="text-sm text-zinc-500">
          Latest roulette settlements (one row per bet). “Result” reflects win
          lane when won; player pick is not stored on this row.
        </p>
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {errorMessage ?? "Failed to load recent bets."}
        </div>
      ) : null}

      <PanelCard flush>
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 lg:flex-row">
          <input
            type="search"
            placeholder="Filter by player…"
            value={playerQ}
            onChange={(e) => setPlayerQ(e.target.value)}
            disabled={filtersBusy}
            className="h-11 min-w-[160px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 disabled:opacity-50"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                {cols.map((c) => (
                  <th key={c.id} className="whitespace-nowrap px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSort(c.id)}
                      className={cn(
                        "inline-flex items-center gap-1",
                        sortKey === c.id ? "text-sky-400" : "hover:text-zinc-300",
                      )}
                    >
                      {c.label}
                      {sortKey === c.id ? (
                        <span className="font-mono text-[0.65rem] text-zinc-400">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {showInitialLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-zinc-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-zinc-500"
                  >
                    No bets in range.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2.5 font-mono text-zinc-200">
                      {row.username}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-200">
                      {formatMoney(row.betAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {outcomeLabel(row)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-300">
                      {row.multiplier != null && row.multiplier > 0
                        ? `${row.multiplier.toFixed(2)}×`
                        : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 font-mono",
                        (row.profit ?? 0) >= 0
                          ? "text-emerald-400"
                          : "text-rose-400",
                      )}
                    >
                      {row.profit != null ? formatMoney(row.profit) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-500">
                      {new Date(row.createdAt).toLocaleString(undefined, {
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </section>
  );
}
