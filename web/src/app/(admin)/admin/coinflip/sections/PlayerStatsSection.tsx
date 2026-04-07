"use client";

import { Modal } from "@/components/ui/modal";
import { formatMoney } from "../components/formatMoney";
import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { CoinflipUserModerationActions } from "../components/CoinflipUserModerationActions";
import { cn } from "../components/cn";
import { useCoinflipPlayerHistory } from "../hooks/useCoinflipPlayerHistory";
import { COINFLIP_PLAYERS_KEY } from "../hooks/coinflip-players-query-keys";
import { useCoinflipPlayers } from "../hooks/useCoinflipPlayers";
import { useCoinflipPlayersModerationMap } from "../hooks/useCoinflipPlayersModerationMap";
import { formatBannedUntilUtc, formatRemainingBanLabel } from "../lib/format-coinflip-ban";
import type { CoinflipUserModerationDetail } from "@/lib/admin-api/coinflip-user-moderation";
import type { CoinflipPlayerListItem } from "@/lib/admin-api/coinflip-players";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 25;
const HISTORY_PAGE = 15;
const SEARCH_DEBOUNCE_MS = 400;

type SortField =
  | "totalWagered"
  | "profitLoss"
  | "winRate"
  | "totalGames"
  | "username";

export function PlayerStatsSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortField>("totalWagered");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState<"all" | "active" | "limited" | "banned">(
    "all",
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, order, status]);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      sort,
      order,
      status,
      ...(debouncedSearch ? { username: debouncedSearch } : {}),
    }),
    [page, sort, order, status, debouncedSearch],
  );

  const listQuery = useCoinflipPlayers(listParams);
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const playerUsernames = useMemo(
    () => items.map((p) => p.username),
    [items],
  );
  const moderationMap = useCoinflipPlayersModerationMap(playerUsernames);

  const invalidatePlayers = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: COINFLIP_PLAYERS_KEY });
  }, [queryClient]);

  const [historyUser, setHistoryUser] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const historyQuery = useCoinflipPlayerHistory(
    historyUser,
    historyPage,
    HISTORY_PAGE,
  );

  useEffect(() => {
    if (historyUser) setHistoryPage(1);
  }, [historyUser]);

  const loadError =
    listQuery.isError && listQuery.error instanceof Error
      ? listQuery.error.message
      : listQuery.isError
        ? "Failed to load players"
        : null;

  return (
    <section id="players" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Player coinflip stats</h2>
        <p className="text-sm text-zinc-500">
          Live data from{" "}
          <span className="font-mono text-zinc-400">/admin/coinflip/players</span>
          . Everyone who appears in finished{" "}
          <span className="font-mono text-zinc-400">CoinflipGameHistory</span> is
          listed. Stats prefer{" "}
          <span className="font-mono text-zinc-400">UserGameStatistics</span>{" "}
          (coinflip); if that row is missing for older games, totals are estimated
          from history (same half-pot rule as the per-player history modal). Ban /
          limits sync to Redis for the WS.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <CoinflipPanelCard flush>
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="text-xs text-zinc-500">
            Search username
            <input
              type="search"
              placeholder="Substring match…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="mt-1 h-11 w-full min-w-[200px] rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortField)}
              className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 sm:w-44"
            >
              <option value="totalWagered">Total wagered</option>
              <option value="profitLoss">Profit / loss</option>
              <option value="winRate">Win rate</option>
              <option value="totalGames">Games played</option>
              <option value="username">Username</option>
            </select>
          </label>
          <label className="text-xs text-zinc-500">
            Order
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 sm:w-32"
            >
              <option value="desc">High → low</option>
              <option value="asc">Low → high</option>
            </select>
          </label>
          <label className="text-xs text-zinc-500">
            Moderation
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as typeof status)
              }
              className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 sm:w-36"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="limited">Limited</option>
              <option value="banned">Banned</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void listQuery.refetch()}
            disabled={listQuery.isFetching}
            className="h-11 shrink-0 rounded-xl border border-zinc-600 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            {listQuery.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Games</th>
                <th className="px-3 py-3">Win %</th>
                <th className="px-3 py-3">Wagered</th>
                <th className="px-3 py-3">W / L</th>
                <th className="px-3 py-3">P/L</th>
                <th className="px-3 py-3 min-w-[220px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {listQuery.isPending && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No players match this filter.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr
                    key={p.userId}
                    className="bg-zinc-900/30 hover:bg-zinc-800/30"
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-zinc-200">
                        {p.username}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-600">
                        {p.userId}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <ModerationStatus
                        item={p}
                        moderationDetail={moderationMap.byUser.get(p.username)}
                        moderationLoading={
                          moderationMap.getState(p.username).isPending
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-400">
                      {p.totalGames}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-400">
                      {p.winRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-300">
                      {formatMoney(Number(p.totalWagered))}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">
                      {p.wins} / {p.losses}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 font-mono font-medium",
                        Number(p.profitLoss) >= 0
                          ? "text-emerald-400"
                          : "text-rose-400",
                      )}
                    >
                      {formatMoney(Number(p.profitLoss))}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-2 gap-x-1 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          className="text-left text-xs text-sky-400 hover:underline"
                          onClick={() => setHistoryUser(p.username)}
                        >
                          History
                        </button>
                       
                        <div className="mt-1 w-full border-t border-zinc-800/80 pt-2 sm:mt-0 sm:w-auto sm:border-0 sm:pt-0">
                          <CoinflipUserModerationActions
                            username={p.username}
                            detail={moderationMap.byUser.get(p.username)}
                            isLoading={
                              moderationMap.getState(p.username).isPending
                            }
                            isError={
                              moderationMap.getState(p.username).isError
                            }
                            onAfterMutation={invalidatePlayers}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          <span>
            Page {page} / {totalPages} — {total} player(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || listQuery.isFetching}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              onClick={() => setPage((n) => Math.max(1, n - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || listQuery.isFetching}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </CoinflipPanelCard>

      <Modal
        isOpen={!!historyUser}
        onClose={() => setHistoryUser(null)}
        className="mx-4 max-w-3xl border border-zinc-800 bg-zinc-900"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
          <h3 className="text-lg font-semibold text-zinc-100">
            Coinflip history
            {historyUser ? (
              <span className="ml-2 font-mono text-sky-300">{historyUser}</span>
            ) : null}
          </h3>
          {historyQuery.isError ? (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {historyQuery.error instanceof Error
                ? historyQuery.error.message
                : "Failed to load history"}
            </p>
          ) : null}
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-500">
                <tr>
                  <th className="px-2 py-2">Game</th>
                  <th className="px-2 py-2">Opponent</th>
                  <th className="px-2 py-2">Wager</th>
                  <th className="px-2 py-2">Result</th>
                  <th className="px-2 py-2">P/L</th>
                  <th className="px-2 py-2">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {historyQuery.isPending ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-8 text-center text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  (historyQuery.data?.items ?? []).map((row) => (
                    <tr key={row.gameId} className="text-zinc-300">
                      <td className="px-2 py-1.5 font-mono text-sky-300">
                        {row.gameId.slice(0, 8)}…
                      </td>
                      <td className="px-2 py-1.5">{row.opponentUsername}</td>
                      <td className="px-2 py-1.5 font-mono">
                        {formatMoney(Number(row.wagerAmount))}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 font-medium",
                          row.result === "win"
                            ? "text-emerald-400"
                            : "text-rose-400",
                        )}
                      >
                        {row.result}
                      </td>
                      <td className="px-2 py-1.5 font-mono">
                        {formatMoney(Number(row.profitLoss))}
                      </td>
                      <td className="px-2 py-1.5 text-zinc-500">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {historyQuery.data?.total != null
                ? `${historyQuery.data.total} game(s)`
                : "—"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={historyPage <= 1 || historyQuery.isFetching}
                className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 disabled:opacity-40"
                onClick={() => setHistoryPage((n) => Math.max(1, n - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={
                  !historyQuery.data ||
                  historyPage * HISTORY_PAGE >= historyQuery.data.total ||
                  historyQuery.isFetching
                }
                className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 disabled:opacity-40"
                onClick={() => setHistoryPage((n) => n + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function ModerationStatus({
  item,
  moderationDetail,
  moderationLoading,
}: {
  item: CoinflipPlayerListItem;
  moderationDetail: CoinflipUserModerationDetail | undefined;
  moderationLoading: boolean;
}) {
  const status = moderationDetail?.status ?? item.status;
  const limits = moderationDetail?.limits ?? item.limits;

  const badge =
    status === "banned"
      ? "bg-rose-950/50 text-rose-300 ring-rose-800/50"
      : status === "limited"
        ? "bg-amber-950/40 text-amber-200 ring-amber-800/50"
        : "bg-zinc-800/80 text-zinc-400 ring-zinc-700";


  return (
    <div>
      {moderationLoading && !moderationDetail ? (
        <span className="text-[10px] text-zinc-600">Loading…</span>
      ) : null}
      <span
        className={cn(
          "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
          badge,
        )}
        title={
          moderationDetail?.note
            ? `Note: ${moderationDetail.note}`
            : undefined
        }
      >
        {status}
      </span>
      {limits && (limits.maxWagerAmount || limits.maxGamesPerHour != null) ? (
        <div className="mt-1 text-[10px] leading-snug text-zinc-600">
          {limits.maxWagerAmount != null ? (
            <div>max {formatMoney(Number(limits.maxWagerAmount))}</div>
          ) : null}
          {limits.maxGamesPerHour != null ? (
            <div>{limits.maxGamesPerHour} / hr</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
