"use client";

import { formatMoney } from "../../dice/components/formatMoney";
import { InputField } from "../../dice/components/InputField";
import { PanelCard } from "../../dice/components/PanelCard";
import {
  useRoulettePlayers,
  useRoulettePlayersControls,
} from "../hooks/useRoulettePlayers";
import type { RoulettePlayersSortField } from "@/lib/admin-api/roulette-players";
import {
  banRoulettePlayer,
  deleteRouletteRestriction,
  fetchRouletteRestriction,
  setRouletteRestriction,
  unbanRoulettePlayer,
  type RestrictionTimeframe,
} from "@/lib/admin-api/roulette-restrictions";
import { cn } from "../../dice/components/cn";
import { useCallback, useEffect, useState } from "react";

function SortHeader({
  label,
  field,
  active,
  order,
  onSort,
}: {
  label: string;
  field: RoulettePlayersSortField;
  active: boolean;
  order: "asc" | "desc";
  onSort: (field: RoulettePlayersSortField) => void;
}) {
  return (
    <th className="px-3 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 text-xs uppercase tracking-wide",
          active ? "text-sky-400" : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        {label}
        {active ? (
          <span className="font-mono text-[0.65rem] text-zinc-400">
            {order === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </th>
  );
}

function restrictionSummary(r: {
  isBanned: boolean;
  maxWagerAmount: number | null;
  timeframe: RestrictionTimeframe | null;
}): string {
  if (r.isBanned) return "Banned";
  if (r.maxWagerAmount != null && r.timeframe) {
    return `Cap ${r.maxWagerAmount} / ${r.timeframe}`;
  }
  return "—";
}

export function PlayerStatsSection() {
  const { q, setQ, page, setPage, sort, setSort, order, setOrder } =
    useRoulettePlayersControls();
  const limit = 25;

  const query = useRoulettePlayers({
    username: q,
    page,
    limit,
    sort,
    order,
  });

  const { data, loading, isError, errorMessage } = query;
  const players = data?.players ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [panelUser, setPanelUser] = useState<string | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [draftBanned, setDraftBanned] = useState(false);
  const [draftReason, setDraftReason] = useState("");
  const [draftMax, setDraftMax] = useState("");
  const [draftTf, setDraftTf] = useState<"" | RestrictionTimeframe>("");
  const [quickBanReason, setQuickBanReason] = useState("");

  const applyResponseToDraft = useCallback(
    (restriction: {
      isBanned: boolean;
      banReason: string | null;
      maxWagerAmount: number | null;
      timeframe: RestrictionTimeframe | null;
    } | null) => {
      if (!restriction) {
        setDraftBanned(false);
        setDraftReason("");
        setDraftMax("");
        setDraftTf("");
        return;
      }
      setDraftBanned(restriction.isBanned);
      setDraftReason(restriction.banReason ?? "");
      setDraftMax(
        restriction.maxWagerAmount != null
          ? String(restriction.maxWagerAmount)
          : "",
      );
      setDraftTf(restriction.timeframe ?? "");
    },
    [],
  );

  useEffect(() => {
    if (!panelUser) return;
    const ac = new AbortController();
    setPanelLoading(true);
    setPanelError(null);
    setActionError(null);
    void fetchRouletteRestriction(panelUser, ac.signal)
      .then((r) => {
        applyResponseToDraft(r.restriction);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setPanelError(
          e instanceof Error ? e.message : "Failed to load restriction.",
        );
      })
      .finally(() => setPanelLoading(false));
    return () => ac.abort();
  }, [panelUser, applyResponseToDraft]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const parseSaveBody = () => {
    const maxTrim = draftMax.trim();
    let maxWagerAmount: number | null = null;
    if (maxTrim !== "") {
      const n = Number(maxTrim);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error("Max wager must be a non-negative number or empty.");
      }
      maxWagerAmount = n > 0 ? n : null;
    }
    const timeframe: RestrictionTimeframe | null =
      maxWagerAmount != null && draftTf !== "" ? draftTf : null;
    if (
      (maxWagerAmount != null && !timeframe) ||
      (timeframe != null && maxWagerAmount == null)
    ) {
      throw new Error(
        "Set both max wager and timeframe together, or clear both.",
      );
    }
    return {
      isBanned: draftBanned,
      banReason: draftReason.trim() || null,
      maxWagerAmount,
      timeframe,
    };
  };

  const onSaveFull = async () => {
    if (!panelUser || actionBusy) return;
    setActionError(null);
    let body;
    try {
      body = parseSaveBody();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Invalid form.");
      return;
    }
    setActionBusy(true);
    try {
      const r = await setRouletteRestriction(panelUser, body);
      applyResponseToDraft(r.restriction);
      showToast("Restriction saved.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const onQuickBan = async () => {
    if (!panelUser || actionBusy) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const r = await banRoulettePlayer(panelUser, quickBanReason);
      applyResponseToDraft(r.restriction);
      setQuickBanReason("");
      showToast("Player banned from roulette.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ban failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const onUnban = async () => {
    if (!panelUser || actionBusy) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const r = await unbanRoulettePlayer(panelUser);
      applyResponseToDraft(r.restriction);
      showToast("Ban removed (row may still exist for wager limits).");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Unban failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const onDeleteRow = async () => {
    if (!panelUser || actionBusy) return;
    if (
      !window.confirm(
        `Remove roulette restriction row for ${panelUser}? This clears ban and wager limits in DB and Redis.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setActionBusy(true);
    try {
      await deleteRouletteRestriction(panelUser);
      applyResponseToDraft(null);
      showToast("Restriction removed.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const onSort = (f: RoulettePlayersSortField) => {
    if (sort === f) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(f);
      setOrder("desc");
    }
    setPage(1);
  };

  const colCount = 5;

  return (
    <section id="players" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Player statistics</h2>
        <p className="text-sm text-zinc-500">
          Aggregated from roulette rows in <code className="text-zinc-400">GameHistory</code>
          (all time window — filter by name below).
        </p>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">
          {toast}
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {errorMessage ?? "Failed to load players."}
        </div>
      ) : null}

      <PanelCard flush>
        <div className="border-b border-zinc-800 p-4">
          <input
            type="search"
            placeholder="Search username…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="h-11 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                <th className="px-3 py-3">User</th>
                <SortHeader
                  label="Games"
                  field="games"
                  active={sort === "games"}
                  order={order}
                  onSort={onSort}
                />
                <SortHeader
                  label="Wagered"
                  field="wagered"
                  active={sort === "wagered"}
                  order={order}
                  onSort={onSort}
                />
                <SortHeader
                  label="Player P/L"
                  field="profit"
                  active={sort === "profit"}
                  order={order}
                  onSort={onSort}
                />
                <th className="px-3 py-3 text-right">Restrictions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading && players.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-8 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-8 text-center text-zinc-500">
                    No players found.
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr key={p.username} className="hover:bg-zinc-900/40">
                    <td className="px-3 py-2.5 font-mono text-zinc-200">
                      {p.username}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-300">
                      {p.games}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-200">
                      {formatMoney(p.wagered)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 font-mono",
                        p.userProfit >= 0 ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {formatMoney(p.userProfit)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setPanelUser(p.username);
                          setQuickBanReason("");
                          setActionError(null);
                        }}
                        className="rounded-lg border border-zinc-600 px-2.5 py-1 text-xs text-zinc-200 hover:border-sky-600 hover:text-sky-300"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages} · {total} players
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </PanelCard>

      {panelUser ? (
        <PanelCard
          title={`Roulette restrictions · ${panelUser}`}
          subtitle="DB is source of truth; Redis is synced for live play."
          headerRight={
            <button
              type="button"
              onClick={() => setPanelUser(null)}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </button>
          }
        >
          {panelLoading ? (
            <p className="text-sm text-zinc-500">Loading restriction…</p>
          ) : null}
          {panelError ? (
            <div className="mb-4 rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {panelError}
            </div>
          ) : null}
          {actionError ? (
            <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
              {actionError}
            </div>
          ) : null}

          {!panelLoading && !panelError ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                <span className="rounded-md border border-zinc-700 bg-zinc-900/60 px-2 py-1 font-mono">
                  Summary:{" "}
                  {draftBanned || draftMax || draftTf
                    ? restrictionSummary({
                        isBanned: draftBanned,
                        maxWagerAmount:
                          draftMax.trim() === ""
                            ? null
                            : Number(draftMax) || null,
                        timeframe: draftTf || null,
                      })
                    : "No active row (or empty limits)"}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={draftBanned}
                    disabled={actionBusy}
                    onChange={(e) => setDraftBanned(e.target.checked)}
                    className="rounded border-zinc-600"
                  />
                  Banned from roulette
                </label>
                <InputField
                  label="Ban reason (optional)"
                  id="rr-ban-reason"
                  value={draftReason}
                  disabled={actionBusy}
                  onChange={setDraftReason}
                />
                <InputField
                  label="Max wager (window)"
                  id="rr-max"
                  type="number"
                  step="0.01"
                  min="0"
                  value={draftMax}
                  disabled={actionBusy}
                  onChange={setDraftMax}
                  hint="Leave empty with no timeframe to clear cap."
                />
                <div>
                  <label
                    htmlFor="rr-tf"
                    className="mb-1.5 block text-xs font-medium text-zinc-400"
                  >
                    Timeframe
                  </label>
                  <select
                    id="rr-tf"
                    disabled={actionBusy}
                    value={draftTf}
                    onChange={(e) =>
                      setDraftTf(e.target.value as "" | RestrictionTimeframe)
                    }
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
                  >
                    <option value="">— none —</option>
                    <option value="HOURLY">HOURLY</option>
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKLY">WEEKLY</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void onSaveFull()}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
                >
                  Save changes
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
                  onClick={() => void onDeleteRow()}
                  className="rounded-xl border border-rose-800/80 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950/40 disabled:opacity-40"
                >
                  Remove restriction
                </button>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Quick ban
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px] flex-1">
                    <InputField
                      label="Reason (optional)"
                      id="rr-quick-ban"
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
                <p className="mt-2 text-xs text-zinc-500">
                  Quick ban keeps existing wager limits if any. Use Save to edit everything at once.
                </p>
              </div>
            </div>
          ) : null}
        </PanelCard>
      ) : null}
    </section>
  );
}
