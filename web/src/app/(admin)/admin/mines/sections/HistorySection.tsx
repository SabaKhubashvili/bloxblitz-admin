"use client";

import { Modal } from "@/components/ui/modal";
import type { MinesHistoryGame } from "@/lib/admin-api/mines-history";
import { fetchMinesHistoryApi } from "@/lib/admin-api/mines-history";
import { formatMoney } from "../components/formatMoney";
import { GridPreview } from "../components/GridPreview";
import { MinesPanelCard } from "../components/MinesPanelCard";
import { useMinesAdmin } from "../context/MinesAdminContext";
import { useTableSort } from "../hooks/useTableSort";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../components/cn";

function playerProfitLoss(g: MinesHistoryGame): number {
  return g.payout - g.betAmount;
}

export function HistorySection() {
  const { config } = useMinesAdmin();
  const [games, setGames] = useState<MinesHistoryGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerQ, setPlayerQ] = useState("");
  const [minBet, setMinBet] = useState("");
  const [detail, setDetail] = useState<MinesHistoryGame | null>(null);

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchMinesHistoryApi(20);
      setGames(Array.isArray(res.games) ? res.games : []);
    } catch (e) {
      console.error("[HistorySection] fetch failed", e);
      setGames([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const id = setInterval(() => void load(true), 12_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const pq = playerQ.trim().toLowerCase();
    const min = Number(minBet) || 0;
    return games.filter((h) => {
      if (h.betAmount < min) return false;
      if (pq && !h.userId.toLowerCase().includes(pq)) return false;
      return true;
    });
  }, [games, playerQ, minBet]);

  const getValue = useMemo(
    () => (row: MinesHistoryGame, col: string) => {
      switch (col) {
        case "id":
          return row.id;
        case "user":
          return row.userId;
        case "bet":
          return row.betAmount;
        case "mines":
          return "\u2014";
        case "tiles":
          return "\u2014";
        case "mult":
          return row.multiplier;
        case "pl":
          return playerProfitLoss(row);
        case "time":
          return row.createdAt;
        default:
          return row.id;
      }
    },
    [],
  );

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filtered,
    getValue,
    "time",
    "desc",
  );

  const cols = [
    { id: "id", label: "Game ID" },
    { id: "user", label: "User" },
    { id: "bet", label: "Bet" },
    { id: "mines", label: "Mines" },
    { id: "tiles", label: "Tiles" },
    { id: "mult", label: "×" },
    { id: "pl", label: "P/L" },
    { id: "time", label: "Time" },
  ] as const;

  const showInitialLoading = loading && games.length === 0;
  const showEmpty = !showInitialLoading && sorted.length === 0;

  return (
    <section id="history" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Game history</h2>
        <p className="text-sm text-zinc-500">
          Sort, filter, inspect grid outcome (admin view).
        </p>
      </div>

      <MinesPanelCard flush>
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row">
          <input
            type="search"
            placeholder="Player…"
            value={playerQ}
            onChange={(e) => setPlayerQ(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
          />
          <input
            type="number"
            placeholder="Min bet"
            value={minBet}
            onChange={(e) => setMinBet(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 font-mono sm:w-32"
          />
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
                    {c.label}
                    {sortKey === c.id ? (
                      <span className="ml-1 text-amber-400">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    ) : null}
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
                    Loading…
                  </td>
                </tr>
              ) : showEmpty ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No rows.
                  </td>
                </tr>
              ) : (
                sorted.map((h) => {
                  const pl = playerProfitLoss(h);
                  return (
                    <tr
                      key={h.id}
                      onClick={() => setDetail(h)}
                      className="cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/40"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                        {h.id}
                      </td>
                      <td className="px-3 py-2 text-zinc-300">{h.userId}</td>
                      <td className="px-3 py-2 font-mono text-emerald-400">
                        {formatMoney(h.betAmount)}
                      </td>
                      <td className="px-3 py-2 font-mono text-emerald-400">
                        —
                      </td>
                      <td className="px-3 py-2 font-mono text-emerald-400">
                        —
                      </td>
                      <td className="px-3 py-2 font-mono text-sky-300">
                        {h.multiplier.toFixed(2)}×
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 font-mono font-medium",
                          pl >= 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {formatMoney(pl)}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </MinesPanelCard>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        className="mx-4 max-w-lg border border-zinc-800 bg-zinc-900"
      >
        {detail ? (
          <div className="p-6 pt-12">
            <h3 className="font-mono text-amber-200">{detail.id}</h3>
            <p className="mt-2 text-sm text-zinc-400">{detail.userId}</p>
            <div className="mt-4 flex justify-center">
              <GridPreview
                gridSize={config.gridSize}
                cells={Array.from(
                  { length: config.gridSize * config.gridSize },
                  () => null,
                )}
                animateHidden={false}
              />
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Red = mine · Green = cleared safe · Gray = unrevealed
            </p>
            <dl className="mt-4 space-y-2 text-sm text-zinc-400">
              <div className="flex justify-between">
                <dt>Bet</dt>
                <dd className="font-mono">{formatMoney(detail.betAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>P/L</dt>
                <dd
                  className={cn(
                    "font-mono",
                    playerProfitLoss(detail) >= 0
                      ? "text-emerald-400"
                      : "text-rose-400",
                  )}
                >
                  {formatMoney(playerProfitLoss(detail))}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
