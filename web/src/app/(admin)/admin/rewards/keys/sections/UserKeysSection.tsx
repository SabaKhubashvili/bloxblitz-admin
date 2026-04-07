"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Key, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../mines/components/cn";
import { MinesPanelCard } from "../../../mines/components/MinesPanelCard";
import {
  fetchAdminUsersListApi,
  type AdminUserRow,
} from "@/lib/admin-api/admin-users";
import {
  useUserKeyBalances,
  useSetUserKeyBalance,
} from "../hooks/useUserKeys";
import type { UserKeyCaseRowApi } from "@/lib/admin-api/reward-case-keys-admin";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const LARGE_CHANGE = 50;

/* ─────────────────────────────────────────────
   Key-edit row inside the side panel
───────────────────────────────────────────── */
function KeyEditRow({
  row,
  username,
  onSaved,
}: {
  row: UserKeyCaseRowApi;
  username: string;
  onSaved: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(row.balance));
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingNew, setPendingNew] = useState<number | null>(null);
  const setKey = useSetUserKeyBalance();
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setInputVal(String(row.balance));
    setReason("");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancel = () => {
    setEditing(false);
    setConfirmOpen(false);
    setPendingNew(null);
  };

  const requestSave = () => {
    const newBalance = parseInt(inputVal, 10);
    if (!Number.isFinite(newBalance) || newBalance < 0) return;
    const delta = newBalance - row.balance;
    if (Math.abs(delta) >= LARGE_CHANGE) {
      setPendingNew(newBalance);
      setConfirmOpen(true);
    } else {
      void doSave(newBalance);
    }
  };

  const doSave = async (newBalance: number) => {
    setConfirmOpen(false);
    setPendingNew(null);
    try {
      const res = await setKey.mutateAsync({
        username,
        rewardCaseId: row.rewardCaseId,
        newBalance,
        reason: reason.trim() || undefined,
      });
      setEditing(false);
      onSaved(
        `${row.title}: ${res.previousBalance} → ${res.balance} (Δ${res.delta >= 0 ? "+" : ""}${res.delta})`,
      );
    } catch (e) {
      onSaved(`Error: ${e instanceof Error ? e.message : "Save failed"}`);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900/60 p-3",
        !row.isActive && "opacity-50",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Case image */}
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          {row.imageUrl ? (
            <Image
              src={row.imageUrl}
              alt={row.title}
              fill
              className="object-contain p-0.5"
              sizes="36px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Key className="h-4 w-4 text-zinc-600" />
            </div>
          )}
        </div>

        {/* Case info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-zinc-100">
            {row.title}
            {!row.isActive && (
              <span className="ml-1.5 rounded bg-zinc-700/60 px-1 py-0.5 text-[10px] text-zinc-400">
                Inactive
              </span>
            )}
          </p>
          <p className="font-mono text-[10px] text-zinc-500">{row.slug}</p>
        </div>

        {/* Balance + edit */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <input
                ref={inputRef}
                type="number"
                min={0}
                max={100_000}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") requestSave();
                  if (e.key === "Escape") cancel();
                }}
                className="w-20 rounded-lg border border-violet-500 bg-zinc-950 px-2 py-1 text-center text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                disabled={setKey.isPending}
                onClick={requestSave}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {setKey.isPending ? "…" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg px-1.5 py-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <span className="min-w-8 text-right font-mono text-sm font-semibold text-zinc-100">
                {row.balance}
              </span>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reason input when editing */}
      {editing && (
        <input
          type="text"
          placeholder="Reason (optional, logged)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
        />
      )}

      {/* Large-change confirm */}
      {confirmOpen && pendingNew !== null && (
        <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div className="flex-1 text-xs text-amber-200">
            Change <strong>{row.title}</strong> from{" "}
            <strong>{row.balance}</strong> → <strong>{pendingNew}</strong> (Δ
            {pendingNew - row.balance >= 0 ? "+" : ""}
            {pendingNew - row.balance})?
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void doSave(pendingNew)}
              className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-zinc-900 hover:bg-amber-400"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-300 hover:text-white"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Per-user key panel (slide-in from right)
───────────────────────────────────────────── */
function UserKeyPanel({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const { data: rows, isLoading, isError, error } = useUserKeyBalances(username);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Key balances</p>
          <p className="font-mono text-xs text-zinc-400">{username}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {statusMsg && (
          <p
            className={cn(
              "mb-3 rounded-lg border px-3 py-2 text-xs",
              statusMsg.startsWith("Error")
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
            )}
            role="status"
          >
            {statusMsg}
          </p>
        )}

        {isLoading && (
          <p className="text-xs text-zinc-500">Loading…</p>
        )}
        {isError && (
          <p className="text-xs text-rose-400">
            {error instanceof Error ? error.message : "Failed to load."}
          </p>
        )}

        {rows && rows.length === 0 && (
          <p className="text-xs text-zinc-500">No reward cases configured.</p>
        )}

        {rows && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((row) => (
              <KeyEditRow
                key={row.rewardCaseId}
                row={row}
                username={username}
                onSaved={(m) => setStatusMsg(m)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main section — paginated user table
───────────────────────────────────────────── */
export function UserKeysSection() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  /* debounce search input */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  /* fetch user list */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetchAdminUsersListApi({
        email: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
        sort: "created_at",
        order: "desc",
      });
      setUsers(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return (
    <section className="flex gap-4">
      {/* ── Left: user table ── */}
      <div className={cn("flex-1 min-w-0 transition-all", selectedUsername ? "lg:max-w-[calc(100%-22rem)]" : "")}>
        <MinesPanelCard
          title="User reward keys"
          subtitle="Select a user to view and edit their key balances per reward case."
        >
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter by username / email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => void fetchUsers()}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
              >
                Refresh
              </button>
            </div>

            {/* Error */}
            {loadErr && (
              <p className="px-1 text-xs text-rose-400">{loadErr}</p>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2.5">Username</th>
                    <th className="px-3 py-2.5 hidden sm:table-cell">Level</th>
                    <th className="px-3 py-2.5 hidden md:table-cell">Role</th>
                    <th className="px-3 py-2.5 text-right">Keys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-xs text-zinc-500">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-xs text-zinc-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    users.map((u) => {
                      const active = selectedUsername === u.username;
                      return (
                        <tr
                          key={u.id}
                          className={cn(
                            "cursor-pointer transition-colors",
                            active
                              ? "bg-violet-500/10 text-zinc-100"
                              : "text-zinc-300 hover:bg-zinc-800/50",
                          )}
                          onClick={() =>
                            setSelectedUsername(
                              active ? null : u.username,
                            )
                          }
                        >
                          <td className="px-3 py-2.5">
                            <div>
                              <p className="font-medium text-zinc-100">
                                {u.username}
                              </p>
                              {u.email && (
                                <p className="text-[11px] text-zinc-500">
                                  {u.email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 hidden sm:table-cell">
                            <span className="font-mono text-xs text-zinc-300">
                              {u.current_level}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <span className="rounded-lg border border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-400">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              className={cn(
                                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                                active
                                  ? "border-violet-500 bg-violet-500/20 text-violet-200"
                                  : "border-zinc-700 text-zinc-400 hover:border-violet-500 hover:text-violet-300",
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUsername(
                                  active ? null : u.username,
                                );
                              }}
                            >
                              <Key className="inline h-3 w-3 mr-1 -mt-0.5" />
                              {active ? "Close" : "Edit keys"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1 pb-1">
                <p className="text-xs text-zinc-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </MinesPanelCard>
      </div>

      {/* ── Right: per-user key panel ── */}
      {selectedUsername && (
        <div className="w-full lg:w-84 lg:min-w-84 shrink-0">
          <div className="sticky top-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-xl shadow-black/30 backdrop-blur-sm lg:max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
            <UserKeyPanel
              username={selectedUsername}
              onClose={() => setSelectedUsername(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
