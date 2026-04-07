"use client";

import { Modal } from "@/components/ui/modal";
import Pagination from "@/components/tables/Pagination";
import {
  banCrashPlayer,
  clearCrashPlayerRestrictions,
  type CrashPlayerListItem,
  fetchCrashPlayersList,
  type CrashPlayersRangePreset,
  type CrashPlayersSortField,
  limitCrashPlayer,
} from "@/lib/admin-api/crash-players";
import { CrashButton } from "../components/CrashButton";
import { CrashCard } from "../components/CrashCard";
import { CrashDataTable, type ColumnDef } from "../components/CrashDataTable";
import { formatMoney } from "../components/formatMoney";
import type { PlayerRowStatus } from "../mock/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../components/cn";

const PAGE_SIZE = 20;

const COLUMN_TO_SORT: Record<string, CrashPlayersSortField | null> = {
  user: "username",
  wagered: "totalWagered",
  pl: "profitLoss",
  bets: "totalBets",
};

function toMoney(n: string | number) {
  const x = typeof n === "string" ? Number.parseFloat(n) : n;
  if (Number.isNaN(x)) return 0;
  return x;
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlayersSection() {
  const [items, setItems] = useState<CrashPlayerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlayerRowStatus | "all">(
    "all",
  );
  const [rangePreset, setRangePreset] =
    useState<CrashPlayersRangePreset>("30d");
  const [customFrom, setCustomFrom] = useState(() =>
    toDatetimeLocalValue(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ),
  );
  const [customTo, setCustomTo] = useState(() =>
    toDatetimeLocalValue(new Date()),
  );

  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>("wagered");
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>("desc");

  const [detail, setDetail] = useState<CrashPlayerListItem | null>(null);
  const [banTarget, setBanTarget] = useState<CrashPlayerListItem | null>(null);
  const [limitTarget, setLimitTarget] = useState<CrashPlayerListItem | null>(
    null,
  );

  const [banNote, setBanNote] = useState("");
  const [limitMax, setLimitMax] = useState("");
  const [limitCooldown, setLimitCooldown] = useState("");
  const [limitNote, setLimitNote] = useState("");

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      400,
    );
    return () => window.clearTimeout(t);
  }, [search]);

  const apiSortField = useMemo((): CrashPlayersSortField => {
    if (!sortKey) return "totalWagered";
    return COLUMN_TO_SORT[sortKey] ?? "totalWagered";
  }, [sortKey]);

  const apiSortOrder = sortDir === "asc" ? "asc" : "desc";

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const fromIso =
        rangePreset === "custom"
          ? new Date(customFrom).toISOString()
          : undefined;
      const toIso =
        rangePreset === "custom" ? new Date(customTo).toISOString() : undefined;
      if (
        rangePreset === "custom" &&
        fromIso &&
        toIso &&
        new Date(fromIso).getTime() >= new Date(toIso).getTime()
      ) {
        setListError("`From` must be before `to` for a custom range.");
        setItems([]);
        setTotal(0);
        return;
      }

      const data = await fetchCrashPlayersList({
        range: rangePreset,
        from: fromIso,
        to: toIso,
        search: debouncedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit: PAGE_SIZE,
        sort: apiSortField,
        order: apiSortOrder,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setListError(e instanceof Error ? e.message : "Failed to load players.");
    } finally {
      setLoading(false);
    }
  }, [
    rangePreset,
    customFrom,
    customTo,
    debouncedSearch,
    statusFilter,
    page,
    apiSortField,
    apiSortOrder,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const columns: ColumnDef<CrashPlayerListItem>[] = [
    { id: "user", header: "Username", cell: (r) => r.username },
    {
      id: "wagered",
      header: "Total wagered",
      sortable: true,
      accessor: (r) => toMoney(r.totalWagered),
      cell: (r) => (
        <span className="font-mono text-zinc-200">
          {formatMoney(toMoney(r.totalWagered))}
        </span>
      ),
    },
    {
      id: "pl",
      header: "Profit / loss",
      sortable: true,
      accessor: (r) => toMoney(r.profitLoss),
      cell: (r) => {
        const pl = toMoney(r.profitLoss);
        return (
          <span
            className={cn(
              "font-mono font-medium",
              pl >= 0 ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {formatMoney(pl)}
          </span>
        );
      },
    },
    {
      id: "bets",
      header: "Bets",
      sortable: true,
      accessor: (r) => r.totalBets,
      cell: (r) => (
        <span className="font-mono">{r.totalBets.toLocaleString()}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
            r.status === "active" && "bg-emerald-500/15 text-emerald-400",
            r.status === "limited" && "bg-amber-500/15 text-amber-400",
            r.status === "banned" && "bg-rose-500/15 text-rose-400",
          )}
        >
          {r.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="flex flex-wrap gap-2">
          <CrashButton
            variant="ghost"
            className="!px-2 !py-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setDetail(r);
            }}
          >
            View
          </CrashButton>
          {r.status !== "banned" ? (
            <CrashButton
              variant="warning"
              className="!px-2 !py-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setLimitMax(
                  r.limits?.maxBetAmount != null
                    ? String(toMoney(r.limits.maxBetAmount))
                    : "",
                );
                setLimitCooldown(
                  r.limits?.minSecondsBetweenBets != null
                    ? String(r.limits.minSecondsBetweenBets)
                    : "",
                );
                setLimitNote("");
                setLimitTarget(r);
              }}
            >
              Limit
            </CrashButton>
          ) : null}
          {r.status !== "banned" ? (
            <CrashButton
              variant="danger"
              className="!px-2 !py-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setBanNote("");
                setBanTarget(r);
              }}
            >
              Ban
            </CrashButton>
          ) : null}
          {r.status !== "active" ? (
            <CrashButton
              variant="secondary"
              className="!px-2 !py-1 text-xs"
              disabled={actionBusy}
              onClick={async (e) => {
                e.stopPropagation();
                if (
                  !window.confirm(
                    `Clear all Crash restrictions for ${r.username}?`,
                  )
                ) {
                  return;
                }
                setActionError(null);
                setActionBusy(true);
                try {
                  await clearCrashPlayerRestrictions(r.username);
                  await load();
                } catch (err) {
                  setActionError(
                    err instanceof Error
                      ? err.message
                      : "Could not clear restrictions.",
                  );
                } finally {
                  setActionBusy(false);
                }
              }}
            >
              Clear
            </CrashButton>
          ) : null}
        </div>
      ),
    },
  ];

  const onSort = (key: string) => {
    if (!COLUMN_TO_SORT[key]) return;
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
    setPage(1);
  };

  return (
    <section id="players" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Player management
        </h2>
        <p className="text-sm text-zinc-500">
          Crash-only wagered, P/L, and bet counts from admin-api. Ban, cap stakes,
          or add cooldowns; the game enforces these on new Crash bets.
        </p>
      </div>

      <CrashCard flush>
        {(listError || actionError) && (
          <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {listError ? <p>{listError}</p> : null}
            {actionError ? (
              <p className={listError ? "mt-1" : undefined}>{actionError}</p>
            ) : null}
          </div>
        )}
        <div className="flex flex-col gap-4 border-b border-zinc-800 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-500">
              Time range
              <select
                value={rangePreset}
                onChange={(e) => {
                  setRangePreset(e.target.value as CrashPlayersRangePreset);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {rangePreset === "custom" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  From
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => {
                      setCustomFrom(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-500">
                  To
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => {
                      setCustomTo(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100"
                  />
                </label>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search username…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="limited">Limited</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 py-16 text-center text-sm text-zinc-500">
              Loading players…
            </div>
          ) : (
            <CrashDataTable
              columns={columns}
              data={items}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              emptyMessage="No players match your filters."
            />
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Page {pageSafe} of {totalPages} · {total.toLocaleString()} total
            </p>
            <Pagination
              currentPage={pageSafe}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      </CrashCard>

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        {detail ? (
          <div className="p-6 pt-12">
            <h3 className="text-lg font-semibold text-white">
              {detail.username}
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <dt>Wagered (window)</dt>
                <dd className="font-mono text-zinc-200">
                  {formatMoney(toMoney(detail.totalWagered))}
                </dd>
              </div>
              <div className="flex justify-between text-zinc-400">
                <dt>P/L (window)</dt>
                <dd
                  className={cn(
                    "font-mono",
                    toMoney(detail.profitLoss) >= 0
                      ? "text-emerald-400"
                      : "text-rose-400",
                  )}
                >
                  {formatMoney(toMoney(detail.profitLoss))}
                </dd>
              </div>
              <div className="flex justify-between text-zinc-400">
                <dt>Bets (window)</dt>
                <dd className="font-mono text-zinc-200">{detail.totalBets}</dd>
              </div>
              <div className="flex justify-between text-zinc-400">
                <dt>Status</dt>
                <dd className="capitalize text-zinc-200">{detail.status}</dd>
              </div>
              {detail.limits ? (
                <div className="border-t border-zinc-800 pt-3 text-zinc-500">
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Limits
                  </p>
                  <ul className="mt-2 gap-1 text-zinc-400">
                    {detail.limits.maxBetAmount != null ? (
                      <li>
                        Max bet:{" "}
                        <span className="font-mono text-zinc-200">
                          {formatMoney(toMoney(detail.limits.maxBetAmount))}
                        </span>
                      </li>
                    ) : null}
                    {detail.limits.minSecondsBetweenBets != null ? (
                      <li>
                        Cooldown: {detail.limits.minSecondsBetweenBets}s between
                        Crash bets
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!limitTarget}
        onClose={() => setLimitTarget(null)}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        {limitTarget ? (
          <div className="p-6 pt-12">
            <h3 className="text-lg font-semibold text-amber-200">
              Limit player
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              <strong>{limitTarget.username}</strong> — set at least one cap.
              Leave a field empty to leave it unchanged; send 0 or clear via API
              if you need to remove a cap (or use Clear on the row).
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-zinc-500">
                Max bet amount (USD)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={limitMax}
                  onChange={(e) => setLimitMax(e.target.value)}
                  placeholder="e.g. 25"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Min seconds between Crash bets
                <input
                  type="number"
                  step={1}
                  min={1}
                  value={limitCooldown}
                  onChange={(e) => setLimitCooldown(e.target.value)}
                  placeholder="e.g. 30"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Note (optional)
                <input
                  value={limitNote}
                  onChange={(e) => setLimitNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            </div>
            {actionError ? (
              <p className="mt-3 text-sm text-rose-400">{actionError}</p>
            ) : null}
            <div className="mt-4 flex gap-3">
              <CrashButton
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setLimitTarget(null);
                  setActionError(null);
                }}
              >
                Cancel
              </CrashButton>
              <CrashButton
                variant="warning"
                className="flex-1"
                disabled={actionBusy}
                onClick={async () => {
                  setActionError(null);
                  const body: Parameters<typeof limitCrashPlayer>[1] = {};
                  if (limitMax.trim() !== "") {
                    const n = Number.parseFloat(limitMax);
                    if (Number.isNaN(n)) {
                      setActionError("Max bet must be a valid number.");
                      return;
                    }
                    body.maxBetAmount = n;
                  }
                  if (limitCooldown.trim() !== "") {
                    const s = Number.parseInt(limitCooldown, 10);
                    if (Number.isNaN(s)) {
                      setActionError("Cooldown must be a whole number of seconds.");
                      return;
                    }
                    body.minSecondsBetweenBets = s;
                  }
                  if (limitNote.trim()) body.note = limitNote.trim();
                  if (
                    body.maxBetAmount === undefined &&
                    body.minSecondsBetweenBets === undefined &&
                    body.note === undefined
                  ) {
                    setActionError(
                      "Enter a max bet and/or cooldown, or a note if limits already exist.",
                    );
                    return;
                  }
                  if (
                    body.maxBetAmount === undefined &&
                    body.minSecondsBetweenBets === undefined &&
                    limitTarget.status !== "limited"
                  ) {
                    setActionError(
                      "Add a max bet or cooldown for players who are not yet limited.",
                    );
                    return;
                  }
                  setActionBusy(true);
                  try {
                    await limitCrashPlayer(limitTarget.username, body);
                    setLimitTarget(null);
                    await load();
                  } catch (err) {
                    setActionError(
                      err instanceof Error ? err.message : "Request failed.",
                    );
                  } finally {
                    setActionBusy(false);
                  }
                }}
              >
                {actionBusy ? "Saving…" : "Save limits"}
              </CrashButton>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!banTarget}
        onClose={() => setBanTarget(null)}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        {banTarget ? (
          <div className="p-6 pt-12">
            <h3 className="text-lg font-semibold text-rose-300">
              Ban from Crash?
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              <strong>{banTarget.username}</strong> will not be able to place
              Crash bets until restrictions are cleared.
            </p>
            <label className="mt-4 block text-xs text-zinc-500">
              Note (optional)
              <textarea
                value={banNote}
                onChange={(e) => setBanNote(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            {actionError ? (
              <p className="mt-3 text-sm text-rose-400">{actionError}</p>
            ) : null}
            <div className="mt-4 flex gap-3">
              <CrashButton
                variant="ghost"
                onClick={() => {
                  setBanTarget(null);
                  setActionError(null);
                }}
              >
                Cancel
              </CrashButton>
              <CrashButton
                variant="danger"
                className="flex-1"
                disabled={actionBusy}
                onClick={async () => {
                  setActionError(null);
                  setActionBusy(true);
                  try {
                    await banCrashPlayer(banTarget.username, {
                      note: banNote.trim() || undefined,
                    });
                    setBanTarget(null);
                    await load();
                  } catch (err) {
                    setActionError(
                      err instanceof Error ? err.message : "Request failed.",
                    );
                  } finally {
                    setActionBusy(false);
                  }
                }}
              >
                {actionBusy ? "Banning…" : "Ban"}
              </CrashButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
