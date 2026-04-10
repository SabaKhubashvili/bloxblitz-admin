"use client";

import { formatMoney } from "../../dice/components/formatMoney";
import { InputField } from "../../dice/components/InputField";
import { PanelCard } from "../../dice/components/PanelCard";
import { useTowersPlayerDetail } from "../hooks/useTowersPlayerDetail";
import { useTowersPlayers } from "../hooks/useTowersPlayers";
import {
  banTowersPlayer,
  deleteTowersRestriction,
  fetchTowersRestriction,
  setTowersRestriction,
  unbanTowersPlayer,
  type TowersRestrictionInfo,
} from "@/lib/admin-api/towers-restrictions";
import { useCallback, useEffect, useState } from "react";

function restrictionSummary(r: TowersRestrictionInfo | null): string {
  if (!r) return "—";
  if (r.isBanned) return "Banned";
  const parts: string[] = [];
  if (r.dailyWagerLimit != null) parts.push(`D:${r.dailyWagerLimit}`);
  if (r.weeklyWagerLimit != null) parts.push(`W:${r.weeklyWagerLimit}`);
  if (r.monthlyWagerLimit != null) parts.push(`M:${r.monthlyWagerLimit}`);
  if (parts.length) return `Limits ${parts.join(", ")}`;
  return "Row (no limits)";
}

export function PlayerStatsSection() {
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<string | null>(null);

  const q = useTowersPlayers(applied, page, 20);
  const detailQ = useTowersPlayerDetail(detailUser);

  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [draftBanned, setDraftBanned] = useState(false);
  const [draftBanReason, setDraftBanReason] = useState("");
  const [draftDaily, setDraftDaily] = useState("");
  const [draftWeekly, setDraftWeekly] = useState("");
  const [draftMonthly, setDraftMonthly] = useState("");
  const [draftLimitReason, setDraftLimitReason] = useState("");
  const [quickBanReason, setQuickBanReason] = useState("");

  const applyRestrictionToDraft = useCallback(
    (restriction: TowersRestrictionInfo | null) => {
      if (!restriction) {
        setDraftBanned(false);
        setDraftBanReason("");
        setDraftDaily("");
        setDraftWeekly("");
        setDraftMonthly("");
        setDraftLimitReason("");
        return;
      }
      setDraftBanned(restriction.isBanned);
      setDraftBanReason(restriction.banReason ?? "");
      setDraftDaily(
        restriction.dailyWagerLimit != null
          ? String(restriction.dailyWagerLimit)
          : "",
      );
      setDraftWeekly(
        restriction.weeklyWagerLimit != null
          ? String(restriction.weeklyWagerLimit)
          : "",
      );
      setDraftMonthly(
        restriction.monthlyWagerLimit != null
          ? String(restriction.monthlyWagerLimit)
          : "",
      );
      setDraftLimitReason(restriction.limitReason ?? "");
    },
    [],
  );

  useEffect(() => {
    if (!detailUser) return;
    const ac = new AbortController();
    setPanelLoading(true);
    setPanelError(null);
    setActionError(null);
    void fetchTowersRestriction(detailUser, ac.signal)
      .then((r) => {
        applyRestrictionToDraft(r.restriction);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setPanelError(
          e instanceof Error ? e.message : "Failed to load restriction.",
        );
      })
      .finally(() => setPanelLoading(false));
    return () => ac.abort();
  }, [detailUser, applyRestrictionToDraft]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const parseLimit = (raw: string): number | null => {
    const t = raw.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("Wager limits must be empty or non-negative numbers.");
    }
    if (n === 0) {
      throw new Error("Use empty field for “no limit”, not zero.");
    }
    return n;
  };

  const onSaveRestriction = async () => {
    if (!detailUser || actionBusy) return;
    setActionError(null);
    let body;
    try {
      body = {
        isBanned: draftBanned,
        banReason: draftBanReason.trim() || null,
        dailyWagerLimit: parseLimit(draftDaily),
        weeklyWagerLimit: parseLimit(draftWeekly),
        monthlyWagerLimit: parseLimit(draftMonthly),
        limitReason: draftLimitReason.trim() || null,
      };
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Invalid form.");
      return;
    }
    setActionBusy(true);
    try {
      const r = await setTowersRestriction(detailUser, body);
      applyRestrictionToDraft(r.restriction);
      showToast("Towers restriction saved.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const onQuickBan = async () => {
    if (!detailUser || actionBusy) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const r = await banTowersPlayer(detailUser, quickBanReason);
      applyRestrictionToDraft(r.restriction);
      setQuickBanReason("");
      showToast("Player banned from Towers.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ban failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const onUnban = async () => {
    if (!detailUser || actionBusy) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const r = await unbanTowersPlayer(detailUser);
      applyRestrictionToDraft(r.restriction);
      showToast("Ban removed (row may still exist for wager limits).");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Unban failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const onDeleteRestriction = async () => {
    if (!detailUser || actionBusy) return;
    if (
      !window.confirm(
        `Remove Towers restriction row for ${detailUser}? This clears ban and wager limits in DB and Redis.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setActionBusy(true);
    try {
      await deleteTowersRestriction(detailUser);
      applyRestrictionToDraft(null);
      showToast("Restriction removed.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const totalPages = q.data
    ? Math.max(1, Math.ceil(q.data.total / q.data.limit))
    : 1;

  return (
    <section id="players" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Player statistics</h2>
        <p className="text-sm text-zinc-500">
          Aggregates per user for settled Towers rounds. Click a row to inspect recent games and moderation.
        </p>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">
          {toast}
        </div>
      ) : null}

      <PanelCard title="Search" subtitle="Partial username match">
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="username"
          />
          <button
            type="button"
            onClick={() => {
              setApplied(search.trim());
              setPage(1);
            }}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Search
          </button>
        </div>
      </PanelCard>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-left text-sm text-zinc-200">
          <thead className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Games</th>
              <th className="px-3 py-2">Wagered</th>
              <th className="px-3 py-2">Net P/L</th>
              <th className="px-3 py-2">Avg mult</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : null}
            {q.data?.players.map((p) => (
              <tr
                key={p.username}
                className="cursor-pointer border-b border-zinc-800/80 hover:bg-zinc-900/50"
                onClick={() => setDetailUser(p.username)}
              >
                <td className="px-3 py-2 font-mono text-xs">{p.username}</td>
                <td className="px-3 py-2">{p.totalGamesPlayed}</td>
                <td className="px-3 py-2">{formatMoney(p.totalWagered)}</td>
                <td className="px-3 py-2">{formatMoney(p.netProfitLoss)}</td>
                <td className="px-3 py-2">{p.avgMultiplier.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {q.data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
          <span>
            Page {q.data.page} of {totalPages} · {q.data.total} players
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

      {detailUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {detailUser}
                </h3>
                <p className="text-xs text-zinc-500">
                  Last 30 settled games · Towers moderation (Redis{" "}
                  <code className="text-zinc-400">towers:restrictions</code>)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailUser(null)}
                className="rounded-lg border border-zinc-600 px-2 py-1 text-sm text-zinc-300"
              >
                Close
              </button>
            </div>

            {panelLoading ? (
              <p className="mt-4 text-sm text-zinc-500">Loading restriction…</p>
            ) : null}
            {panelError ? (
              <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                {panelError}
              </div>
            ) : null}
            {actionError ? (
              <div className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                {actionError}
              </div>
            ) : null}

            {!panelLoading && !panelError ? (
              <div className="mt-6 space-y-6 border-t border-zinc-800 pt-6">
                <div>
                  <h4 className="text-sm font-medium text-zinc-200">
                    Restriction
                  </h4>
                                   <p className="mt-1 text-xs text-zinc-500">
                    Summary:{" "}
                    <span className="font-mono text-zinc-400">
                      {restrictionSummary({
                        isBanned: draftBanned,
                        banReason: draftBanReason.trim() || null,
                        dailyWagerLimit:
                          draftDaily.trim() === ""
                            ? null
                            : Number(draftDaily),
                        weeklyWagerLimit:
                          draftWeekly.trim() === ""
                            ? null
                            : Number(draftWeekly),
                        monthlyWagerLimit:
                          draftMonthly.trim() === ""
                            ? null
                            : Number(draftMonthly),
                        limitReason: draftLimitReason.trim() || null,
                      })}
                    </span>
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={draftBanned}
                        disabled={actionBusy}
                        onChange={(e) => setDraftBanned(e.target.checked)}
                        className="rounded border-zinc-600"
                      />
                      Banned from Towers
                    </label>
                    <InputField
                      label="Ban reason (optional)"
                      id="tw-ban-reason"
                      value={draftBanReason}
                      disabled={actionBusy}
                      onChange={setDraftBanReason}
                    />
                    <InputField
                      label="Daily wager cap (rolling24h)"
                      id="tw-daily"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={draftDaily}
                      disabled={actionBusy}
                      onChange={setDraftDaily}
                      hint="Empty = no daily cap"
                    />
                    <InputField
                      label="Weekly wager cap (rolling 7d)"
                      id="tw-weekly"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={draftWeekly}
                      disabled={actionBusy}
                      onChange={setDraftWeekly}
                    />
                    <InputField
                      label="Monthly wager cap (rolling 30d)"
                      id="tw-monthly"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={draftMonthly}
                      disabled={actionBusy}
                      onChange={setDraftMonthly}
                    />
                    <InputField
                      label="Limit note (optional)"
                      id="tw-limit-note"
                      value={draftLimitReason}
                      disabled={actionBusy}
                      onChange={setDraftLimitReason}
                      hint="Shown to staff; optional context for wager caps."
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void onSaveRestriction()}
                      className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
                    >
                      Save restriction
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void onUnban()}
                      className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                    >
                      Unban only
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => void onDeleteRestriction()}
                      className="rounded-xl border border-rose-800/80 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950/40 disabled:opacity-40"
                    >
                      Remove restriction row
                    </button>
                  </div>
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Quick ban
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[200px] flex-1">
                        <InputField
                          label="Reason (optional)"
                          id="tw-quick-ban"
                          value={quickBanReason}
                          disabled={actionBusy}
                          onChange={setQuickBanReason}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void onQuickBan()}
                        className="h-10 rounded-xl border border-rose-700/80 bg-rose-950/30 px-4 text-sm text-rose-200 hover:bg-rose-950/50 disabled:opacity-40"
                      >
                        Ban now
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-zinc-200">
                    Recent games
                  </h4>
                  {detailQ.isLoading ? (
                    <p className="mt-2 text-sm text-zinc-500">Loading…</p>
                  ) : null}
                  {detailQ.data ? (
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2 text-zinc-300">
                        <div>
                          Games:{" "}
                          <span className="text-white">
                            {detailQ.data.totalGamesPlayed}
                          </span>
                        </div>
                        <div>
                          Wagered:{" "}
                          <span className="text-white">
                            {formatMoney(detailQ.data.totalWagered)}
                          </span>
                        </div>
                        <div>
                          Net P/L:{" "}
                          <span className="text-white">
                            {formatMoney(detailQ.data.netProfitLoss)}
                          </span>
                        </div>
                        <div>
                          Avg mult:{" "}
                          <span className="text-white">
                            {detailQ.data.avgMultiplier.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <ul className="space-y-2 border-t border-zinc-800 pt-3">
                        {detailQ.data.recentGames.map((g) => (
                          <li
                            key={g.id}
                            className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400"
                          >
                            <span className="capitalize text-zinc-200">
                              {g.outcome}
                            </span>
                            <span>
                              {formatMoney(g.betAmount)} →{" "}
                              {formatMoney(g.profit)}
                            </span>
                            <span>×{g.multiplier.toFixed(4)}</span>
                            <span>
                              {new Date(g.createdAt).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
