"use client";

import { Modal } from "@/components/ui/modal";
import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import type { CoinflipFraudSuspiciousGameItem } from "@/lib/admin-api/coinflip-fraud";
import { cn } from "../components/cn";
import { useSuspiciousGames } from "../hooks/useSuspiciousGames";
import { useCallback, useEffect, useState } from "react";

const PAGE = 25;
const FILTER_DEBOUNCE_MS = 400;

export function SuspiciousGamesSection() {
  const [minInput, setMinInput] = useState("12");
  const [maxInput, setMaxInput] = useState("100");
  const [debounced, setDebounced] = useState({ min: 12, max: 100 });
  const [offset, setOffset] = useState(0);
  const [detail, setDetail] = useState<CoinflipFraudSuspiciousGameItem | null>(
    null,
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      const min = Math.min(100, Math.max(0, Number(minInput) || 0));
      const max = Math.min(100, Math.max(0, Number(maxInput) || 100));
      setDebounced((d) =>
        d.min === min && d.max === max ? d : { min, max },
      );
    }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [minInput, maxInput]);

  useEffect(() => {
    setOffset(0);
  }, [debounced.min, debounced.max]);

  const query = useSuspiciousGames({
    minScore: debounced.min,
    maxScore: debounced.max,
    offset,
    limit: PAGE,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const loadError =
    query.isError && query.error instanceof Error
      ? query.error.message
      : query.isError
        ? "Failed to load suspicious games"
        : null;

  const maxOffset = Math.max(0, total - PAGE);
  const pageEnd = Math.min(offset + items.length, offset + PAGE);

  const refetch = useCallback(() => void query.refetch(), [query]);

  return (
    <>
      <section id="fraud-games" className="scroll-mt-28 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Fraud · Suspicious games
          </h2>
          <p className="text-sm text-zinc-500">
            Game-level fraud signals from settled games (automated rules) and{" "}
            <span className="font-mono text-zinc-400">MANUAL_STAFF_FLAG</span>{" "}
            merged onto that user&apos;s recent games when you flag them. Player
            IDs are not in this list — use the game ID in history or live games.
          </p>
        </div>

        {loadError ? (
          <p className="text-sm text-red-400" role="alert">
            {loadError}
          </p>
        ) : null}

        <CoinflipPanelCard flush>
          <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="text-xs text-zinc-500">
              Min score
              <input
                type="number"
                min={0}
                max={100}
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 font-mono text-sm text-zinc-100 sm:w-28"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Max score
              <input
                type="number"
                min={0}
                max={100}
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 font-mono text-sm text-zinc-100 sm:w-28"
              />
            </label>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={query.isFetching}
              className="h-11 shrink-0 rounded-xl border border-zinc-600 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              {query.isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                  <th className="px-3 py-3">Game ID</th>
                  <th className="px-3 py-3">Players</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3 min-w-[200px]">Signals</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {query.isPending && items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      No suspicious games in this range.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const highlight = row.riskScore >= 50;
                    return (
                      <tr
                        key={row.gameId}
                        className={cn(
                          highlight && "bg-rose-950/15",
                          "hover:bg-zinc-900/50",
                        )}
                      >
                        <td className="px-3 py-2 font-mono text-sky-300">
                          {row.gameId}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          <span className="text-xs">
                            Not in API payload
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-100">
                          {row.riskScore}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex max-w-lg flex-wrap gap-1">
                            {row.reasons.length === 0 ? (
                              <span className="text-zinc-600">—</span>
                            ) : (
                              row.reasons.map((r) => (
                                <span
                                  key={r}
                                  className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                                >
                                  {r}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                            onClick={() => setDetail(row)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
            <span>
              {total === 0
                ? "0 rows"
                : `Showing ${offset + 1}–${pageEnd} of ${total}`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset <= 0 || query.isFetching}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + PAGE >= total || query.isFetching}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                onClick={() =>
                  setOffset((o) => Math.min(maxOffset, o + PAGE))
                }
              >
                Next
              </button>
            </div>
          </div>
        </CoinflipPanelCard>
      </section>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        className="mx-4 max-w-lg border border-zinc-800 bg-zinc-900"
      >
        {detail ? (
          <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
            <h3 className="font-mono text-lg text-sky-300">{detail.gameId}</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Risk score:{" "}
              <span className="font-mono text-zinc-100">{detail.riskScore}</span>
            </p>
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Reasons (raw)
              </h4>
              {detail.reasons.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-500">None.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {detail.reasons.map((r) => (
                    <li
                      key={r}
                      className="font-mono text-xs text-zinc-300 break-all"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-600">
              Correlate with History tab or active lobbies using this game ID.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
