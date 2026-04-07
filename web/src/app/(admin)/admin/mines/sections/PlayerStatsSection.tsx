"use client";

import { Modal } from "@/components/ui/modal";
import { formatMoney } from "../components/formatMoney";
import { MinesPanelCard } from "../components/MinesPanelCard";
import type { MinesModerationUiStatus, MinesPlayerStat } from "../mock/types";
import {
  fetchMinesPlayerHistoryApi,
  fetchMinesPlayersApi,
  type MinesPlayerRound,
} from "@/lib/admin-api/mines-players";
import {
  unbanMinesUserApi,
  unlimitMinesUserApi,
  upsertMinesModerationApi,
} from "@/lib/admin-api/mines-moderation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../components/cn";

const PLAYERS_POLL_MS = 12_000;
const SEARCH_DEBOUNCE_MS = 320;
const PAGE_SIZE = 25;

type ModFilter = "all" | MinesModerationUiStatus;

export function PlayerStatsSection() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [modFilter, setModFilter] = useState<ModFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [players, setPlayers] = useState<MinesPlayerStat[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MinesPlayerStat | null>(null);
  const [historyRounds, setHistoryRounds] = useState<MinesPlayerRound[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [banUser, setBanUser] = useState<string | null>(null);
  const [banNote, setBanNote] = useState("");
  const [banError, setBanError] = useState<string | null>(null);
  const [banSubmitting, setBanSubmitting] = useState(false);

  const [limitUser, setLimitUser] = useState<string | null>(null);
  const [limitMaxBet, setLimitMaxBet] = useState("");
  const [limitMaxPerHour, setLimitMaxPerHour] = useState("");
  const [limitNote, setLimitNote] = useState("");
  const [limitError, setLimitError] = useState<string | null>(null);
  const [limitSubmitting, setLimitSubmitting] = useState(false);

  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, modFilter]);

  const loadPlayers = useCallback(
    async (opts?: { background?: boolean }) => {
      const background = opts?.background === true;
      if (!background) setListLoading(true);
      setListError(null);
      try {
        const res = await fetchMinesPlayersApi({
          search: debouncedQ.length > 0 ? debouncedQ : undefined,
          moderationStatus: modFilter,
          page,
          limit: PAGE_SIZE,
        });
        setTotal(res.total);
        setPlayers(
          res.players.map((p) => ({
            id: p.id,
            username: p.username,
            totalGames: p.totalGames,
            totalWins: p.totalWins,
            totalWagered: p.totalWagered,
            avgTilesCleared: p.avgTilesCleared,
            profitLoss: p.profitLoss,
            moderationStatus: p.moderationStatus,
            maxBetAmount: p.maxBetAmount,
            maxGamesPerHour: p.maxGamesPerHour,
          })),
        );
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Failed to load players");
        if (!background) setPlayers([]);
        setTotal(0);
      } finally {
        if (!background) setListLoading(false);
      }
    },
    [debouncedQ, modFilter, page],
  );

  const loadPlayersRef = useRef(loadPlayers);
  loadPlayersRef.current = loadPlayers;

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadPlayersRef.current({ background: true });
    }, PLAYERS_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!detail) {
      setHistoryRounds([]);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    fetchMinesPlayerHistoryApi(detail.username)
      .then((r) => {
        if (!cancelled) setHistoryRounds(r.rounds);
      })
      .catch((e) => {
        if (!cancelled) {
          setHistoryRounds([]);
          setHistoryError(
            e instanceof Error ? e.message : "Failed to load history",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  const refreshPlayers = useCallback(() => {
    void loadPlayersRef.current({ background: true });
  }, []);

  const openBan = (username: string) => {
    setBanNote("");
    setBanError(null);
    setBanUser(username);
  };

  const submitBan = async () => {
    if (!banUser) return;
    setBanSubmitting(true);
    setBanError(null);
    try {
      await upsertMinesModerationApi(banUser, {
        status: "BANNED",
        note: banNote.trim() || null,
      });
      setBanUser(null);
      setActionMsg(`Banned ${banUser}`);
      window.setTimeout(() => setActionMsg(null), 4000);
      refreshPlayers();
    } catch (e) {
      setBanError(e instanceof Error ? e.message : "Ban failed");
    } finally {
      setBanSubmitting(false);
    }
  };

  const openLimit = (username: string) => {
    setLimitMaxBet("");
    setLimitMaxPerHour("");
    setLimitNote("");
    setLimitError(null);
    setLimitUser(username);
  };

  const submitLimit = async () => {
    if (!limitUser) return;
    const maxBetRaw = limitMaxBet.trim();
    const maxHourRaw = limitMaxPerHour.trim();
    const maxBetAmount =
      maxBetRaw === "" ? undefined : Number.parseFloat(maxBetRaw);
    const maxGamesPerHour =
      maxHourRaw === "" ? undefined : Number.parseInt(maxHourRaw, 10);

    if (
      maxBetAmount !== undefined &&
      (!Number.isFinite(maxBetAmount) || maxBetAmount < 0)
    ) {
      setLimitError("Max bet must be a non-negative number.");
      return;
    }
    if (
      maxGamesPerHour !== undefined &&
      (!Number.isFinite(maxGamesPerHour) || maxGamesPerHour < 0)
    ) {
      setLimitError("Max games per hour must be a non-negative integer.");
      return;
    }
    const hasBet =
      maxBetAmount !== undefined && maxBetAmount > 0;
    const hasHour =
      maxGamesPerHour !== undefined && maxGamesPerHour > 0;
    if (!hasBet && !hasHour) {
      setLimitError(
        "Enter a max bet greater than 0 and/or max completed games per hour greater than 0.",
      );
      return;
    }

    setLimitSubmitting(true);
    setLimitError(null);
    try {
      await upsertMinesModerationApi(limitUser, {
        status: "LIMITED",
        maxBetAmount:
          maxBetAmount !== undefined
            ? maxBetAmount > 0
              ? maxBetAmount
              : null
            : undefined,
        maxGamesPerHour:
          maxGamesPerHour !== undefined
            ? maxGamesPerHour > 0
              ? maxGamesPerHour
              : null
            : undefined,
        note: limitNote.trim() || null,
      });
      setLimitUser(null);
      setActionMsg(`Limited ${limitUser}`);
      window.setTimeout(() => setActionMsg(null), 4000);
      refreshPlayers();
    } catch (e) {
      setLimitError(e instanceof Error ? e.message : "Limit failed");
    } finally {
      setLimitSubmitting(false);
    }
  };

  const runUnban = async (username: string) => {
    if (
      !window.confirm(`Remove Mines ban for ${username}? Redis and DB will update.`)
    ) {
      return;
    }
    try {
      await unbanMinesUserApi(username);
      setActionMsg(`Unbanned ${username}`);
      window.setTimeout(() => setActionMsg(null), 4000);
      refreshPlayers();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Unban failed");
    }
  };

  const runUnlimit = async (username: string) => {
    if (
      !window.confirm(
        `Remove Mines wager/hour limits for ${username}? Redis and DB will update.`,
      )
    ) {
      return;
    }
    try {
      await unlimitMinesUserApi(username);
      setActionMsg(`Limits cleared for ${username}`);
      window.setTimeout(() => setActionMsg(null), 4000);
      refreshPlayers();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Unlimit failed");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section id="players" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Player stats</h2>
        <p className="text-sm text-zinc-500">
          Stats from Postgres; moderation column is read from Redis first per
          row. Filter by status uses Redis key scan, then SQL.
        </p>
      </div>

      <MinesPanelCard flush>
        <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 md:flex-row md:flex-wrap md:items-end">
          <div className="flex-initial">
            <label className="text-xs font-medium text-zinc-500">Search</label>
            <input
              type="search"
              placeholder="Username…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 h-11 w-full min-w-[200px] max-w-sm rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">
              Moderation
            </label>
            <select
              value={modFilter}
              onChange={(e) =>
                setModFilter(e.target.value as ModFilter)
              }
              className="mt-1 h-11 w-full min-w-[160px] rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
            >
              <option value="all">All (list)</option>
              <option value="ACTIVE">Active only</option>
              <option value="BANNED">Banned</option>
              <option value="LIMITED">Limited</option>
            </select>
          </div>
          {actionMsg ? (
            <p className="text-xs text-emerald-400 md:ml-auto">{actionMsg}</p>
          ) : null}
        </div>
        {listError ? (
          <p className="border-b border-zinc-800 px-4 py-2 text-xs text-rose-400">
            {listError}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Wins</th>
                <th className="px-4 py-3 text-left">Games</th>
                <th className="px-4 py-3 text-left">Wagered</th>
                <th className="px-4 py-3 text-left">Avg tiles</th>
                <th className="px-4 py-3 text-left">P/L</th>
                <th className="px-4 py-3 text-left">Caps</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {listLoading && players.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Loading players…
                  </td>
                </tr>
              ) : null}
              {!listLoading && players.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No players match this filter.
                  </td>
                </tr>
              ) : null}
              {players.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "bg-zinc-900/30",
                    p.moderationStatus === "BANNED" &&
                      "bg-rose-950/25 ring-1 ring-rose-900/40",
                    p.moderationStatus === "LIMITED" &&
                      "bg-amber-950/20 ring-1 ring-amber-900/35",
                  )}
                >
                  <td className="px-4 py-2 font-medium text-zinc-200">
                    {p.username}
                  </td>
                  <td className="px-4 py-2">
                    <ModerationBadge status={p.moderationStatus} />
                  </td>
                  <td className="px-4 py-2 font-mono text-zinc-400">
                    {p.totalWins}
                  </td>
                  <td className="px-4 py-2 font-mono text-zinc-400">
                    {p.totalGames}
                  </td>
                  <td className="px-4 py-2 font-mono text-emerald-400">
                    {formatMoney(p.totalWagered)}
                  </td>
                  <td className="px-4 py-2 font-mono text-sky-300">
                    {p.avgTilesCleared.toFixed(1)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2 font-mono font-medium",
                      p.profitLoss >= 0
                        ? "text-emerald-400"
                        : "text-rose-400",
                    )}
                  >
                    {formatMoney(p.profitLoss)}
                  </td>
                  <td className="max-w-[140px] px-4 py-2 text-xs text-zinc-500">
                    {p.moderationStatus === "LIMITED" ? (
                      <span className="block font-mono">
                        {p.maxBetAmount != null ? (
                          <span>Max {formatMoney(p.maxBetAmount)}</span>
                        ) : null}
                        {p.maxBetAmount != null && p.maxGamesPerHour != null
                          ? " · "
                          : null}
                        {p.maxGamesPerHour != null ? (
                          <span>{p.maxGamesPerHour}/h</span>
                        ) : null}
                        {p.maxBetAmount == null &&
                        p.maxGamesPerHour == null ? (
                          <span className="text-zinc-600">—</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      <button
                        type="button"
                        className="text-xs text-sky-400 hover:underline"
                        onClick={() => setDetail(p)}
                      >
                        History
                      </button>
                      {p.moderationStatus !== "BANNED" ? (
                        <button
                          type="button"
                          className="text-xs text-amber-400 hover:underline"
                          onClick={() => openLimit(p.username)}
                        >
                          Limit
                        </button>
                      ) : null}
                      {p.moderationStatus !== "BANNED" ? (
                        <button
                          type="button"
                          className="text-xs text-rose-400 hover:underline"
                          onClick={() => openBan(p.username)}
                        >
                          Ban
                        </button>
                      ) : null}
                      {p.moderationStatus === "BANNED" ? (
                        <button
                          type="button"
                          className="text-xs text-emerald-400 hover:underline"
                          onClick={() => void runUnban(p.username)}
                        >
                          Unban
                        </button>
                      ) : null}
                      {p.moderationStatus === "LIMITED" ? (
                        <button
                          type="button"
                          className="text-xs text-teal-400 hover:underline"
                          onClick={() => void runUnlimit(p.username)}
                        >
                          Unlimit
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
            <span>
              Page {page} of {totalPages} · {total} players
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || listLoading}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || listLoading}
                onClick={() => setPage((x) => x + 1)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </MinesPanelCard>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        className="mx-4 max-w-lg border border-zinc-800 bg-zinc-900"
      >
        {detail ? (
          <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
            <h3 className="text-lg font-semibold text-zinc-100">
              {detail.username}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ModerationBadge status={detail.moderationStatus} />
            </div>
            <dl className="mt-4 space-y-2 text-sm text-zinc-400">
              <Row k="Wins / games" v={`${detail.totalWins} / ${detail.totalGames}`} />
              <Row k="Wagered" v={formatMoney(detail.totalWagered)} />
              <Row k="Avg tiles" v={detail.avgTilesCleared.toFixed(2)} />
              <Row k="P/L" v={formatMoney(detail.profitLoss)} />
              {detail.moderationStatus === "LIMITED" ? (
                <Row
                  k="Caps"
                  v={
                    [
                      detail.maxBetAmount != null
                        ? `max ${formatMoney(detail.maxBetAmount)}`
                        : null,
                      detail.maxGamesPerHour != null
                        ? `${detail.maxGamesPerHour}/h`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  }
                />
              ) : null}
            </dl>

            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Rounds
            </h4>
            {historyLoading ? (
              <p className="mt-2 text-sm text-zinc-500">Loading history…</p>
            ) : null}
            {historyError ? (
              <p className="mt-2 text-sm text-rose-400">{historyError}</p>
            ) : null}
            {!historyLoading && !historyError && historyRounds.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                No completed rounds on file for this user.
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {historyRounds.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-zinc-800/90 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-300"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-mono text-zinc-500">
                      {new Date(r.timestamp).toLocaleString()}
                    </span>
                    <span className="text-zinc-500">{r.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-zinc-400">
                    <span>Bet {formatMoney(r.betAmount)}</span>
                    <span>×{r.cashoutMultiplier.toFixed(4)}</span>
                    <span
                      className={
                        r.profitLoss >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }
                    >
                      P/L {formatMoney(r.profitLoss)}
                    </span>
                  </div>
                  <div className="mt-1 text-zinc-500">
                    Grid {r.gridSize}×{r.gridSize} · {r.minesCount} mines ·{" "}
                    {r.tilesCleared} tiles
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!banUser}
        onClose={() => !banSubmitting && setBanUser(null)}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        {banUser ? (
          <div className="p-6 pt-12">
            <h3 className="text-lg font-semibold text-zinc-100">
              Ban from Mines
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              User <span className="font-medium text-zinc-200">{banUser}</span>{" "}
              will be blocked from creating Mines games via Redis moderation.
            </p>
            <label className="mt-4 block text-xs font-medium text-zinc-500">
              Note (optional, max 500 chars)
            </label>
            <textarea
              value={banNote}
              onChange={(e) => setBanNote(e.target.value.slice(0, 500))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
              disabled={banSubmitting}
              placeholder="Reason…"
            />
            {banError ? (
              <p className="mt-2 text-xs text-rose-400">{banError}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={banSubmitting}
                onClick={() => setBanUser(null)}
                className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={banSubmitting}
                onClick={() => void submitBan()}
                className="rounded-xl bg-gradient-to-r from-rose-700 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-rose-600 hover:to-red-600 disabled:opacity-50"
              >
                {banSubmitting ? "Banning…" : "Confirm ban"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!limitUser}
        onClose={() => !limitSubmitting && setLimitUser(null)}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        {limitUser ? (
          <div className="p-6 pt-12">
            <h3 className="text-lg font-semibold text-zinc-100">
              Limit Mines play
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Set caps for{" "}
              <span className="font-medium text-zinc-200">{limitUser}</span>.
              At least one positive cap is required.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-500">
                  Max bet per game (currency)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={limitMaxBet}
                  onChange={(e) => setLimitMaxBet(e.target.value)}
                  disabled={limitSubmitting}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 text-sm text-zinc-100"
                  placeholder="e.g. 25"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">
                  Max completed games per rolling hour
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={limitMaxPerHour}
                  onChange={(e) => setLimitMaxPerHour(e.target.value)}
                  disabled={limitSubmitting}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 text-sm text-zinc-100"
                  placeholder="e.g. 10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">
                  Note (optional)
                </label>
                <textarea
                  value={limitNote}
                  onChange={(e) => setLimitNote(e.target.value.slice(0, 500))}
                  rows={2}
                  disabled={limitSubmitting}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100"
                />
              </div>
            </div>
            {limitError ? (
              <p className="mt-2 text-xs text-rose-400">{limitError}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={limitSubmitting}
                onClick={() => setLimitUser(null)}
                className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={limitSubmitting}
                onClick={() => void submitLimit()}
                className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg hover:from-amber-500 disabled:opacity-50"
              >
                {limitSubmitting ? "Saving…" : "Apply limit"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function ModerationBadge({ status }: { status: MinesModerationUiStatus }) {
  const styles: Record<MinesModerationUiStatus, string> = {
    ACTIVE:
      "border-zinc-600 bg-zinc-800/80 text-zinc-300",
    BANNED:
      "border-rose-500/60 bg-rose-950/50 text-rose-300",
    LIMITED:
      "border-amber-500/50 bg-amber-950/40 text-amber-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      {status === "ACTIVE" ? "Active" : status === "BANNED" ? "Banned" : "Limited"}
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{k}</dt>
      <dd className="font-mono text-zinc-200">{v}</dd>
    </div>
  );
}
