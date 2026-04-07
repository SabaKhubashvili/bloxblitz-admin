"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { formatMoney, formatPct } from "../components/formatMoney";
import { PanelCard } from "../components/PanelCard";
import {
  useDicePlayers,
  type DicePlayersSortField,
} from "../hooks/useDicePlayers";
import {
  banDicePlayer,
  limitDicePlayer,
  type DicePlayerStats,
  type DicePlayerStatusApi,
  unbanDicePlayer,
  unlimitDicePlayer,
} from "@/lib/admin-api/dice-players";
import { useDeferredValue, useState, type ChangeEvent } from "react";
import { cn } from "../components/cn";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function SortHeader({
  label,
  field,
  active,
  order,
  onSort,
}: {
  label: string;
  field: DicePlayersSortField;
  active: boolean;
  order: "asc" | "desc";
  onSort: (f: DicePlayersSortField) => void;
}) {
  return (
    <th className="px-3 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 text-xs uppercase tracking-wide",
          active ? "text-sky-400" : "text-zinc-500 hover:text-zinc-300"
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

function mutErr(e: unknown): string {
  if (isAxiosError(e) && e.response?.data && typeof e.response.data === "object") {
    const o = e.response.data as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.map(String).join(", ");
  }
  return e instanceof Error ? e.message : "Request failed";
}

export function PlayerStatsSection() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q.trim());
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DicePlayersSortField>("rolls");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<
    "all" | DicePlayerStatusApi
  >("all");

  const [banUser, setBanUser] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [unbanUser, setUnbanUser] = useState<string | null>(null);
  const [limitUser, setLimitUser] = useState<string | null>(null);
  const [limitMax, setLimitMax] = useState("100");
  const [limitReason, setLimitReason] = useState("");
  const [unlimitUser, setUnlimitUser] = useState<string | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);

  const limit = 50;
  const query = useDicePlayers({
    username: deferredQ || undefined,
    page,
    limit,
    sort,
    order,
    moderationStatus: statusFilter === "all" ? undefined : statusFilter,
  });

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ["dicePlayers"] });

  const banMut = useMutation({
    mutationFn: (vars: { username: string; reason?: string }) =>
      banDicePlayer(vars.username, vars.reason ? { reason: vars.reason } : {}),
    onSuccess: () => {
      setMutError(null);
      invalidate();
    },
    onError: (e) => setMutError(mutErr(e)),
  });

  const unbanMut = useMutation({
    mutationFn: (u: string) => unbanDicePlayer(u),
    onSuccess: () => {
      setMutError(null);
      invalidate();
    },
    onError: (e) => setMutError(mutErr(e)),
  });

  const limitMut = useMutation({
    mutationFn: (vars: { username: string; maxBet: number; reason?: string }) =>
      limitDicePlayer(vars.username, {
        maxBet: vars.maxBet,
        reason: vars.reason,
      }),
    onSuccess: () => {
      setMutError(null);
      invalidate();
    },
    onError: (e) => setMutError(mutErr(e)),
  });

  const unlimitMut = useMutation({
    mutationFn: (u: string) => unlimitDicePlayer(u),
    onSuccess: () => {
      setMutError(null);
      invalidate();
    },
    onError: (e) => setMutError(mutErr(e)),
  });

  const players = query.data?.players ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const onSort = (field: DicePlayersSortField) => {
    setPage(1);
    if (sort === field) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder(field === "username" ? "asc" : "desc");
    }
  };

  const rowStyle = (p: DicePlayerStats): string => {
    if (p.status === "banned")
      return "bg-rose-950/25 border-l-2 border-l-rose-500/70";
    if (p.status === "limited")
      return "bg-amber-950/20 border-l-2 border-l-amber-500/60";
    return "bg-zinc-900/30";
  };

  const busy =
    banMut.isPending ||
    unbanMut.isPending ||
    limitMut.isPending ||
    unlimitMut.isPending;

  return (
    <section id="players" className="scroll-mt-28 space-y-6 ">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Player dice stats</h2>
        <p className="text-sm text-zinc-500">
          Live aggregates and moderation; actions sync DB + Redis for the game
          API.
        </p>
      </div>

      {query.isError ? (
        <p className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load players."}
        </p>
      ) : null}
      {mutError ? (
        <p className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {mutError}
        </p>
      ) : null}

      <PanelCard flush>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 p-4">
          <input
            type="search"
            placeholder="Filter by username…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="h-11 min-w-[200px] flex-1 max-w-md rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
          />
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | DicePlayerStatusApi);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-200"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="limited">Limited</option>
              <option value="banned">Banned</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                <SortHeader
                  label="User"
                  field="username"
                  active={sort === "username"}
                  order={order}
                  onSort={onSort}
                />
                <SortHeader
                  label="Rolls"
                  field="rolls"
                  active={sort === "rolls"}
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
                  label="Win rate"
                  field="winRate"
                  active={sort === "winRate"}
                  order={order}
                  onSort={onSort}
                />
                <SortHeader
                  label="P/L"
                  field="profitLoss"
                  active={sort === "profitLoss"}
                  order={order}
                  onSort={onSort}
                />
                <SortHeader
                  label="Risk"
                  field="risk"
                  active={sort === "risk"}
                  order={order}
                  onSort={onSort}
                />
                <SortHeader
                  label="Status"
                  field="status"
                  active={sort === "status"}
                  order={order}
                  onSort={onSort}
                />
                <th className="px-3 py-3 text-right text-xs uppercase text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {query.isPending && !query.data ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                    No players match.
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr key={p.username} className={rowStyle(p)}>
                    <td className="px-3 py-2 font-medium text-zinc-200">
                      {p.username}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-400">
                      {p.rolls.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-300">
                      {formatMoney(p.wagered)}
                    </td>
                    <td className="px-3 py-2 font-mono text-sky-300">
                      {formatPct(p.winRate / 100, 1)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 font-mono font-medium",
                        p.profitLoss >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      )}
                    >
                      {formatMoney(p.profitLoss)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          p.risk === "high" && "bg-rose-500/15 text-rose-300",
                          p.risk === "medium" &&
                            "bg-amber-500/15 text-amber-300",
                          p.risk === "low" && "bg-emerald-500/15 text-emerald-300"
                        )}
                      >
                        {p.risk}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span
                          className={cn(
                            "font-medium capitalize",
                            p.status === "banned" && "text-rose-300",
                            p.status === "limited" && "text-amber-300",
                            p.status === "active" && "text-zinc-400"
                          )}
                        >
                          {p.status}
                        </span>
                        {p.status === "limited" && p.maxBet != null ? (
                          <span className="font-mono text-zinc-500">
                            max {formatMoney(p.maxBet)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {p.status === "banned" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setUnbanUser(p.username)}
                            className="rounded-lg border border-emerald-600/50 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setBanReason("");
                              setBanUser(p.username);
                            }}
                            className="rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
                          >
                            Ban
                          </button>
                        )}
                        {p.status === "limited" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setUnlimitUser(p.username)}
                            className="rounded-lg border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                          >
                            Unlimit
                          </button>
                        ) : p.status !== "banned" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setLimitMax("100");
                              setLimitReason("");
                              setLimitUser(p.username);
                            }}
                            className="rounded-lg border border-amber-600/50 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
                          >
                            Limit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.hash = "#history")
                          }
                          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
            <span>
              {total.toLocaleString()} player{total === 1 ? "" : "s"} — page{" "}
              {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || query.isFetching}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </PanelCard>

      <ConfirmDialog
        isOpen={!!banUser}
        onClose={() => setBanUser(null)}
        title="Ban from dice"
        description={
          <BanReasonForm
            username={banUser}
            reason={banReason}
            onReasonChange={setBanReason}
          />
        }
        confirmLabel="Ban"
        onConfirm={() => {
          if (!banUser) return;
          const u = banUser;
          const r = banReason.trim();
          banMut.mutate(
            { username: u, reason: r.length ? r : undefined },
            { onSettled: () => setBanUser(null) },
          );
        }}
      />

      <ConfirmDialog
        isOpen={!!unbanUser}
        onClose={() => setUnbanUser(null)}
        title="Unban dice"
        description={
          <>
            Restore dice access for{" "}
            <span className="font-mono text-zinc-200">{unbanUser}</span>?
          </>
        }
        confirmLabel="Unban"
        variant="primary"
        onConfirm={() => {
          if (!unbanUser) return;
          const u = unbanUser;
          unbanMut.mutate(u, { onSettled: () => setUnbanUser(null) });
        }}
      />

      <ConfirmDialog
        isOpen={!!limitUser}
        onClose={() => setLimitUser(null)}
        title="Limit dice bet size"
        description={
          <LimitBetForm
            username={limitUser}
            maxStr={limitMax}
            onMaxStrChange={setLimitMax}
            reason={limitReason}
            onReasonChange={setLimitReason}
          />
        }
        confirmLabel="Apply limit"
        variant="warning"
        onConfirm={() => {
          if (!limitUser) return;
          const n = Number(limitMax);
          if (!Number.isFinite(n) || n <= 0) {
            setMutError("Enter a valid max bet.");
            return;
          }
          const u = limitUser;
          const r = limitReason.trim();
          limitMut.mutate(
            {
              username: u,
              maxBet: Math.round(n * 100) / 100,
              reason: r.length ? r : undefined,
            },
            { onSettled: () => setLimitUser(null) },
          );
        }}
      />

      <ConfirmDialog
        isOpen={!!unlimitUser}
        onClose={() => setUnlimitUser(null)}
        title="Remove dice bet limit"
        description={
          <>
            Clear moderation limit for{" "}
            <span className="font-mono text-zinc-200">{unlimitUser}</span>?
          </>
        }
        confirmLabel="Unlimit"
        variant="primary"
        onConfirm={() => {
          if (!unlimitUser) return;
          const u = unlimitUser;
          unlimitMut.mutate(u, { onSettled: () => setUnlimitUser(null) });
        }}
      />
    </section>
  );
}

function BanReasonForm({
  username,
  reason,
  onReasonChange,
}: {
  username: string | null;
  reason: string;
  onReasonChange: (v: string) => void;
}) {
  return (
    <>
      <p>
        Ban <span className="font-mono text-zinc-200">{username}</span> from
        dice rolls. They will receive HTTP 403 until unbanned.
      </p>
      <label className="mt-3 block text-xs text-zinc-500">
        Reason (optional)
        <textarea
          value={reason}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onReasonChange(e.target.value)
          }
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
        />
      </label>
    </>
  );
}

function LimitBetForm({
  username,
  maxStr,
  onMaxStrChange,
  reason,
  onReasonChange,
}: {
  username: string | null;
  maxStr: string;
  onMaxStrChange: (v: string) => void;
  reason: string;
  onReasonChange: (v: string) => void;
}) {
  return (
    <>
      <p>
        Cap single-roll stake for{" "}
        <span className="font-mono text-zinc-200">{username}</span>.
      </p>
      <label className="mt-3 block text-xs text-zinc-500">
        Max bet ($)
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={maxStr}
          onChange={(e) => onMaxStrChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
        />
      </label>
      <label className="mt-2 block text-xs text-zinc-500">
        Reason (optional)
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
        />
      </label>
    </>
  );
}
