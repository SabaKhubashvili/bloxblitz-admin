"use client";

import { ConfirmDialog } from "../../mines/components/ConfirmDialog";
import { formatMoney } from "../../mines/components/formatMoney";
import { MinesPanelCard } from "../../mines/components/MinesPanelCard";
import { cn } from "../../mines/components/cn";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  defaultChatBanInfo,
  fetchAdminUsersListApi,
  patchAdminGameUserApi,
  postAdminUserChatBanApi,
  postAdminUserChatUnbanApi,
  postAdminUserGlobalModerationApi,
  type AdminUserLoginStatus,
  type AdminUserModerationStatus,
  type AdminUserRow,
} from "@/lib/admin-api/admin-users";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 320;
const POLL_MS = 25_000;

const ROLE_OPTIONS = [
  "MEMBER",
  "WHALE",
  "BIGFLIPPER",
  "SUPPORT",
  "MODERATOR",
  "COMMUNITY_MANAGER",
  "ADMIN",
  "OWNER",
] as const;

function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) =>
      w.length === 0 ? w : w.charAt(0) + w.slice(1).toLowerCase(),
    )
    .join(" ");
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  MEMBER:
    "border-zinc-600/50 bg-zinc-900/70 text-zinc-400 font-normal",
  WHALE:
    "border-cyan-400/45 bg-cyan-500/15 text-cyan-200 shadow-[0_0_12px_-4px_rgba(34,211,238,0.35)]",
  BIGFLIPPER:
    "border-violet-400/45 bg-violet-500/15 text-violet-200 shadow-[0_0_12px_-4px_rgba(167,139,250,0.35)]",
  SUPPORT:
    "border-sky-400/45 bg-sky-500/12 text-sky-200",
  MODERATOR:
    "border-teal-400/45 bg-teal-500/12 text-teal-200 ring-1 ring-teal-400/15",
  COMMUNITY_MANAGER:
    "border-indigo-400/45 bg-indigo-500/12 text-indigo-200",
  ADMIN:
    "border-amber-400/50 bg-amber-500/18 text-amber-100 font-semibold",
  OWNER:
    "border-fuchsia-400/50 bg-fuchsia-500/16 text-fuchsia-100 font-semibold shadow-[0_0_14px_-3px_rgba(217,70,239,0.4)]",
};

function UserRoleBadge({ role }: { role: string }) {
  const key = role.trim().toUpperCase();
  const style = ROLE_BADGE_STYLES[key] ?? ROLE_BADGE_STYLES.MEMBER;
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-lg border px-2 py-0.5 text-xs font-medium tracking-tight",
        style,
      )}
      title={role}
    >
      <span className="truncate">{formatRoleLabel(key)}</span>
    </span>
  );
}

function ModerationBadge({ status }: { status: AdminUserModerationStatus }) {
  const styles: Record<AdminUserModerationStatus, string> = {
    ACTIVE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    LIMITED: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    BANNED: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function LoginBadge({ status }: { status: AdminUserLoginStatus }) {
  const label =
    status === "NEVER_LOGGED_IN"
      ? "Never logged in"
      : status === "ACTIVE"
        ? "Active (login)"
        : "Inactive (login)";
  return (
    <span className="text-xs text-zinc-500" title={status}>
      {label}
    </span>
  );
}

const relTimeFmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  let diffSec = Math.round((t - Date.now()) / 1000);
  const sign = diffSec < 0 ? -1 : 1;
  diffSec = Math.abs(diffSec);
  if (diffSec < 45) return relTimeFmt.format(sign * Math.round(diffSec), "second");
  if (diffSec < 2700) return relTimeFmt.format(sign * Math.round(diffSec / 60), "minute");
  if (diffSec < 64800) return relTimeFmt.format(sign * Math.round(diffSec / 3600), "hour");
  if (diffSec < 5184000) return relTimeFmt.format(sign * Math.round(diffSec / 86400), "day");
  return relTimeFmt.format(sign * Math.round(diffSec / (86400 * 30)), "month");
}

function formatDateTime(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function dash(v: string | null | undefined): string {
  if (v == null || v.trim() === "") return "—";
  return v;
}

function TrackingSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      <dl className="mt-2 divide-y divide-zinc-800/60">{children}</dl>
    </div>
  );
}

function TrackingRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,128px)_1fr] sm:items-start sm:gap-4">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm text-zinc-200">{children}</dd>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-zinc-500">No entries</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x, i) => (
        <span
          key={`${i}-${x}`}
          className="rounded-md border border-zinc-700/60 bg-zinc-900/80 px-2 py-0.5 font-mono text-[11px] text-zinc-300"
        >
          {x}
        </span>
      ))}
    </div>
  );
}

const USER_ROW_MENU_ITEM_CLASS =
  "block w-full px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

function chatBanForRow(u: AdminUserRow) {
  return u.chat_ban ?? defaultChatBanInfo();
}

function ChatBanStatusCell({ u }: { u: AdminUserRow }) {
  const c = chatBanForRow(u);
  if (!c.banned) {
    return <span className="text-xs text-zinc-500">—</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="font-medium text-rose-300">Banned</span>
      {c.permanent ? (
        <span className="text-[10px] text-zinc-500">Permanent</span>
      ) : c.expires_at ? (
        <span
          className="text-[10px] text-zinc-400"
          title={formatDateTime(c.expires_at)}
        >
          Until {formatRelativeTime(c.expires_at)}
        </span>
      ) : null}
    </div>
  );
}

type ModConfirm =
  | { kind: "ban"; user: AdminUserRow }
  | { kind: "unban"; user: AdminUserRow }
  | { kind: "unlimit"; user: AdminUserRow };

export function UsersManagementSection() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [modFilter, setModFilter] = useState<AdminUserModerationStatus | "all">(
    "all",
  );
  const [loginFilter, setLoginFilter] = useState<
    AdminUserLoginStatus | "all"
  >("all");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"balance" | "wager" | "created_at">(
    "created_at",
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [modConfirm, setModConfirm] = useState<ModConfirm | null>(null);
  const [modNote, setModNote] = useState("");
  const [modError, setModError] = useState<string | null>(null);

  const [limitUser, setLimitUser] = useState<AdminUserRow | null>(null);
  const [limitBet, setLimitBet] = useState("");
  const [limitPerHour, setLimitPerHour] = useState("");
  const [limitNote, setLimitNote] = useState("");
  const [limitBusy, setLimitBusy] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  const [trackingUser, setTrackingUser] = useState<AdminUserRow | null>(null);

  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editBalanceSet, setEditBalanceSet] = useState("");
  const [editBalanceDelta, setEditBalanceDelta] = useState("");
  const [editWagerSet, setEditWagerSet] = useState("");
  const [editWagerDelta, setEditWagerDelta] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editXpSet, setEditXpSet] = useState("");
  const [editXpDelta, setEditXpDelta] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /** One open row menu at a time so the table stays compact as actions grow. */
  const [actionsMenuForUserId, setActionsMenuForUserId] = useState<string | null>(
    null,
  );

  const [toast, setToast] = useState<{
    kind: "ok" | "err";
    message: string;
  } | null>(null);

  const [chatBanTarget, setChatBanTarget] = useState<AdminUserRow | null>(null);
  const [chatBanReason, setChatBanReason] = useState("");
  const [chatBanPermanent, setChatBanPermanent] = useState(true);
  const [chatBanHours, setChatBanHours] = useState("24");
  const [chatBanBusy, setChatBanBusy] = useState(false);
  const [chatBanError, setChatBanError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedQ(q.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, modFilter, loginFilter, roleFilter]);

  useEffect(() => {
    setActionsMenuForUserId(null);
  }, [page, debouncedQ, modFilter, loginFilter, roleFilter]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!opts?.background) setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminUsersListApi({
          email: debouncedQ || undefined,
          moderationStatus: modFilter,
          status: loginFilter === "all" ? undefined : loginFilter,
          role: roleFilter || undefined,
          page,
          limit: PAGE_SIZE,
          sort,
          order,
        });
        setRows(Array.isArray(res.data) ? res.data : []);
        setTotal(res.meta?.totalUsers ?? 0);
      } catch (e) {
        console.error("[UsersManagement]", e);
        setError(e instanceof Error ? e.message : "Failed to load users");
        setRows([]);
      } finally {
        if (!opts?.background) setLoading(false);
      }
    },
    [debouncedQ, modFilter, loginFilter, roleFilter, page, sort, order],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load({ background: true }), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openEdit = (u: AdminUserRow) => {
    setEditUser(u);
    setEditBalanceSet("");
    setEditBalanceDelta("");
    setEditWagerSet("");
    setEditWagerDelta("");
    setEditRole(u.role);
    setEditXpSet("");
    setEditXpDelta("");
    setEditLevel("");
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editUser) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const balSet = editBalanceSet.trim();
      const balDelta = editBalanceDelta.trim();
      const wagerSet = editWagerSet.trim();
      const wagerDelta = editWagerDelta.trim();
      const xpSet = editXpSet.trim();
      const xpDelta = editXpDelta.trim();

      if (balSet && balDelta) {
        throw new Error("Use either set balance or adjust balance, not both.");
      }
      if (wagerSet && wagerDelta) {
        throw new Error("Use either set wagered or adjust wagered, not both.");
      }
      if (xpSet && xpDelta) {
        throw new Error("Use either set XP or adjust XP, not both.");
      }

      const body: Parameters<typeof patchAdminGameUserApi>[1] = {};
      if (balSet) body.balanceSet = balSet;
      if (balDelta) body.balanceDelta = balDelta;
      if (wagerSet) body.totalWageredSet = wagerSet;
      if (wagerDelta) body.totalWageredDelta = wagerDelta;
      if (editRole && editRole !== editUser.role) body.role = editRole;
      if (xpSet) {
        const n = Number(xpSet);
        if (!Number.isInteger(n) || n < 0) {
          throw new Error("Set XP must be a non-negative integer.");
        }
        body.totalXP = n;
      }
      if (xpDelta) {
        const n = Number(xpDelta);
        if (!Number.isInteger(n)) {
          throw new Error("XP adjustment must be a whole number (e.g. +500 or -100).");
        }
        body.totalXPDelta = n;
      }
      if (editLevel.trim()) {
        const n = Number(editLevel);
        if (!Number.isInteger(n) || n < 1) {
          throw new Error("Level must be an integer ≥ 1.");
        }
        if (n !== editUser.current_level) {
          body.currentLevel = n;
        }
      }
      if (Object.keys(body).length === 0) {
        throw new Error("Change at least one field.");
      }
      await patchAdminGameUserApi(editUser.username, body);
      setActionMsg(`Updated ${editUser.username}.`);
      setEditUser(null);
      void load({ background: true });
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setEditBusy(false);
    }
  };

  const toggleSort = (key: typeof sort) => {
    if (sort === key) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSort(key);
      setOrder(key === "created_at" ? "desc" : "desc");
    }
    setPage(1);
  };

  const editShowsInstantOverwrite =
    editBalanceSet.trim() !== "" ||
    editWagerSet.trim() !== "" ||
    editXpSet.trim() !== "" ||
    editLevel.trim() !== "";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">All users</h2>
        <p className="text-sm text-zinc-500">
          Search and filter game accounts. Moderation status is the strictest
          across Dice, Mines, Crash, and Coinflip. Sensitive actions are audited
          on the server.
        </p>
      </div>

      <MinesPanelCard flush>
        <div className=" flex flex-col gap-3 border-b border-zinc-800 p-4 md:flex-row md:flex-wrap md:items-end">
          <div className="min-w-[200px] flex-1">
            <label className="text-xs font-medium text-zinc-500">Search</label>
            <input
              type="search"
              placeholder="Username, Roblox id, or user id…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">
              Moderation
            </label>
            <select
              value={modFilter}
              onChange={(e) =>
                setModFilter(e.target.value as AdminUserModerationStatus | "all")
              }
              className="mt-1 h-11 min-w-[160px] rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
            >
              <option value="all">All</option>
              <option value="ACTIVE">Active</option>
              <option value="LIMITED">Limited</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">
              Login activity
            </label>
            <select
              value={loginFilter}
              onChange={(e) =>
                setLoginFilter(e.target.value as AdminUserLoginStatus | "all")
              }
              className="mt-1 h-11 min-w-[180px] rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
            >
              <option value="all">Any</option>
              <option value="ACTIVE">Recently active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="NEVER_LOGGED_IN">Never logged in</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 h-11 min-w-[160px] rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
            >
              <option value="">Any role</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {actionMsg ? (
            <p className="text-xs text-emerald-400 md:ml-auto">{actionMsg}</p>
          ) : null}
        </div>

        {error ? (
          <p className="border-b border-zinc-800 px-4 py-2 text-xs text-rose-400">
            {error}
          </p>
        ) : null}

        <div className="overflow-x-auto min-h-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    className="font-semibold tracking-wide hover:text-zinc-300"
                    onClick={() => toggleSort("balance")}
                  >
                    Balance
                    {sort === "balance" ? (order === "desc" ? " ↓" : " ↑") : ""}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    className="font-semibold tracking-wide hover:text-zinc-300"
                    onClick={() => toggleSort("wager")}
                  >
                    Wagered
                    {sort === "wager" ? (order === "desc" ? " ↓" : " ↑") : ""}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Chat</th>
                <th className="px-4 py-3 text-left">Login</th>
                <th className="px-4 py-3 text-left">Last activity</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    className="font-semibold tracking-wide hover:text-zinc-300"
                    onClick={() => toggleSort("created_at")}
                  >
                    Created
                    {sort === "created_at"
                      ? order === "desc"
                        ? " ↓"
                        : " ↑"
                      : ""}
                  </button>
                </th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Loading users…
                  </td>
                </tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No users match this filter.
                  </td>
                </tr>
              ) : null}
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className={cn(
                    "bg-zinc-900/30",
                    u.moderation_status === "BANNED" &&
                      "bg-rose-950/25 ring-1 ring-rose-900/40",
                    u.moderation_status === "LIMITED" &&
                      "bg-amber-950/20 ring-1 ring-amber-900/35",
                  )}
                >
                  <td className="px-4 py-2 font-medium text-zinc-200">
                    {u.username}
                  </td>
                  <td className="px-4 py-2 font-mono text-emerald-400">
                    {formatMoney(Number(u.balance))}
                  </td>
                  <td className="px-4 py-2 font-mono text-zinc-400">
                    {formatMoney(Number(u.total_wagered))}
                  </td>
                  <td className="px-4 py-2">
                    <ModerationBadge status={u.moderation_status} />
                  </td>
                  <td className="max-w-[100px] px-4 py-2">
                    <ChatBanStatusCell u={u} />
                  </td>
                  <td className="px-4 py-2">
                    <LoginBadge status={u.status} />
                  </td>
                  <td className="max-w-[160px] px-4 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className="text-xs text-zinc-300"
                        title={formatDateTime(u.last_active_at)}
                      >
                        {formatRelativeTime(u.last_active_at)}
                      </span>
                      <span
                        className="truncate font-mono text-[11px] text-zinc-500"
                        title={
                          u.last_known_ip ??
                          u.last_login_ip ??
                          ""
                        }
                      >
                        {dash(u.last_known_ip ?? u.last_login_ip)}
                      </span>
                      {u.last_device ? (
                        <span className="truncate text-[10px] uppercase tracking-wide text-zinc-600">
                          {u.last_device}
                        </span>
                      ) : null}
                      {u.is_vpn === true || u.is_proxy === true ? (
                        <span className="flex flex-wrap gap-1">
                          {u.is_vpn === true ? (
                            <span className="rounded bg-violet-500/15 px-1.5 py-px text-[10px] font-medium text-violet-300">
                              VPN
                            </span>
                          ) : null}
                          {u.is_proxy === true ? (
                            <span className="rounded bg-orange-500/15 px-1.5 py-px text-[10px] font-medium text-orange-200">
                              Proxy
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <UserRoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td className="relative whitespace-nowrap px-4 py-2 text-right">
                    <div className="relative inline-flex justify-end">
                      <button
                        type="button"
                        className="dropdown-toggle inline-flex items-center gap-1.5 rounded-lg border border-zinc-600/80 bg-zinc-800/90 px-2.5 py-1.5 text-xs font-medium text-zinc-200 shadow-sm outline-none ring-zinc-500 hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-2"
                        aria-expanded={actionsMenuForUserId === u.id}
                        aria-haspopup="menu"
                        aria-label={`Actions for ${u.username}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionsMenuForUserId((open) =>
                            open === u.id ? null : u.id,
                          );
                        }}
                      >
                        <span>Actions</span>
                        <svg
                          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${
                            actionsMenuForUserId === u.id ? "rotate-180" : ""
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <Dropdown
                        isOpen={actionsMenuForUserId === u.id}
                        onClose={() => setActionsMenuForUserId(null)}
                        className="right-0 z-50 mt-1 w-56 overflow-hidden border border-zinc-700! bg-zinc-900! py-1 shadow-xl shadow-black/50"
                      >
                        <div className="border-b border-zinc-800 px-3 py-2">
                          <p className="truncate text-xs font-medium text-zinc-100">
                            {u.username}
                          </p>
                        </div>
                        <DropdownItem
                          baseClassName={USER_ROW_MENU_ITEM_CLASS}
                          className="font-medium text-zinc-100"
                          onClick={() => {
                            setActionsMenuForUserId(null);
                            setTrackingUser(u);
                          }}
                        >
                          Session & tracking
                        </DropdownItem>
                        <DropdownItem
                          baseClassName={USER_ROW_MENU_ITEM_CLASS}
                          className="text-sky-300"
                          onClick={() => {
                            setActionsMenuForUserId(null);
                            openEdit(u);
                          }}
                        >
                          Edit account…
                        </DropdownItem>
                        <div
                          className="my-1 h-px bg-zinc-800"
                          role="presentation"
                        />
                        {u.moderation_status !== "BANNED" ? (
                          <DropdownItem
                            baseClassName={USER_ROW_MENU_ITEM_CLASS}
                            className="text-rose-300"
                            onClick={() => {
                              setActionsMenuForUserId(null);
                              setModNote("");
                              setModError(null);
                              setModConfirm({ kind: "ban", user: u });
                            }}
                          >
                            Ban on all games
                          </DropdownItem>
                        ) : (
                          <DropdownItem
                            baseClassName={USER_ROW_MENU_ITEM_CLASS}
                            className="text-emerald-300"
                            onClick={() => {
                              setActionsMenuForUserId(null);
                              setModNote("");
                              setModError(null);
                              setModConfirm({ kind: "unban", user: u });
                            }}
                          >
                            Unban on all games
                          </DropdownItem>
                        )}
                        {u.moderation_status === "LIMITED" ? (
                          <DropdownItem
                            baseClassName={USER_ROW_MENU_ITEM_CLASS}
                            className="text-teal-300"
                            onClick={() => {
                              setActionsMenuForUserId(null);
                              setModNote("");
                              setModError(null);
                              setModConfirm({ kind: "unlimit", user: u });
                            }}
                          >
                            Remove limits (all games)
                          </DropdownItem>
                        ) : u.moderation_status !== "BANNED" ? (
                          <DropdownItem
                            baseClassName={USER_ROW_MENU_ITEM_CLASS}
                            className="text-amber-300"
                            onClick={() => {
                              setActionsMenuForUserId(null);
                              setLimitUser(u);
                              setLimitBet("100");
                              setLimitPerHour("");
                              setLimitNote("");
                              setLimitError(null);
                            }}
                          >
                            Apply limits (all games)
                          </DropdownItem>
                        ) : null}
                        <div
                          className="my-1 h-px bg-zinc-800"
                          role="presentation"
                        />
                        <DropdownItem
                          baseClassName={USER_ROW_MENU_ITEM_CLASS}
                          className="text-fuchsia-300 disabled:opacity-40"
                          disabled={chatBanForRow(u).banned}
                          onClick={() => {
                            setActionsMenuForUserId(null);
                            setChatBanTarget(u);
                            setChatBanReason("");
                            setChatBanPermanent(true);
                            setChatBanHours("24");
                            setChatBanError(null);
                          }}
                        >
                          Ban from live chat…
                        </DropdownItem>
                        <DropdownItem
                          baseClassName={USER_ROW_MENU_ITEM_CLASS}
                          className="text-fuchsia-200/90 disabled:opacity-40"
                          disabled={!chatBanForRow(u).banned}
                          onClick={() => {
                            void (async () => {
                              setActionsMenuForUserId(null);
                              try {
                                await postAdminUserChatUnbanApi(u.id);
                                setToast({
                                  kind: "ok",
                                  message: `Chat unbanned: ${u.username}`,
                                });
                                void load({ background: true });
                              } catch (e) {
                                setToast({
                                  kind: "err",
                                  message:
                                    e instanceof Error
                                      ? e.message
                                      : "Unban failed",
                                });
                              }
                            })();
                          }}
                        >
                          Unban live chat
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          <span>
            Page {page} / {totalPages} · {total} user(s)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </MinesPanelCard>

      <Modal
        isOpen={trackingUser != null}
        onClose={() => setTrackingUser(null)}
        className="mx-4 max-h-[min(92vh,880px)] max-w-2xl border border-zinc-800 bg-zinc-900 p-0"
      >
        <div className="max-h-[min(92vh,880px)] overflow-y-auto p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Session and tracking
              </h2>
              {trackingUser ? (
                <p className="mt-1 font-mono text-sm text-zinc-400">
                  {trackingUser.username}
                </p>
              ) : null}
            </div>
            {trackingUser?.last_active_at ? (
              <p className="text-right text-xs text-zinc-500">
                Last API activity{" "}
                <span className="text-zinc-300">
                  {formatRelativeTime(trackingUser.last_active_at)}
                </span>
                <br />
                <span className="font-mono text-[11px] text-zinc-600">
                  {formatDateTime(trackingUser.last_active_at)}
                </span>
              </p>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-600">
            IP and device fields follow application retention caps. Geo is
            coarse (e.g. edge country), not precise location.
          </p>

          {trackingUser ? (
            <div className="mt-5 space-y-4">
              <TrackingSection title="Login and counts">
                <TrackingRow label="Last login">
                  <div>
                    <div>{formatDateTime(trackingUser.last_login)}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {formatRelativeTime(trackingUser.last_login)}
                    </div>
                  </div>
                </TrackingRow>
                <TrackingRow label="Login count">
                  {trackingUser.login_count.toLocaleString()}
                </TrackingRow>
              </TrackingSection>

              <TrackingSection title="Network">
                <TrackingRow label="Last known IP">
                  <span className="font-mono text-xs">
                    {dash(trackingUser.last_known_ip)}
                  </span>
                </TrackingRow>
                <TrackingRow label="Last login IP">
                  <span className="font-mono text-xs">
                    {dash(trackingUser.last_login_ip)}
                  </span>
                </TrackingRow>
                <TrackingRow label="Signals">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={cn(
                        "rounded-lg border px-2 py-0.5 font-medium",
                        trackingUser.is_vpn === true
                          ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
                          : trackingUser.is_vpn === false
                            ? "border-zinc-700 bg-zinc-900 text-zinc-400"
                            : "border-zinc-700 bg-zinc-900/50 text-zinc-500",
                      )}
                    >
                      VPN:{" "}
                      {trackingUser.is_vpn === true
                        ? "likely"
                        : trackingUser.is_vpn === false
                          ? "no"
                          : "unknown"}
                    </span>
                    <span
                      className={cn(
                        "rounded-lg border px-2 py-0.5 font-medium",
                        trackingUser.is_proxy === true
                          ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                          : trackingUser.is_proxy === false
                            ? "border-zinc-700 bg-zinc-900 text-zinc-400"
                            : "border-zinc-700 bg-zinc-900/50 text-zinc-500",
                      )}
                    >
                      Proxy:{" "}
                      {trackingUser.is_proxy === true
                        ? "likely"
                        : trackingUser.is_proxy === false
                          ? "no"
                          : "unknown"}
                    </span>
                  </div>
                </TrackingRow>
              </TrackingSection>

              <TrackingSection title="Device and client">
                <TrackingRow label="Device class">
                  {dash(trackingUser.last_device)}
                </TrackingRow>
                <TrackingRow label="Fingerprint">
                  <span className="break-all font-mono text-xs">
                    {dash(trackingUser.device_fingerprint)}
                  </span>
                </TrackingRow>
                <TrackingRow label="User agent">
                  {trackingUser.last_user_agent ? (
                    <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
                      {trackingUser.last_user_agent}
                    </pre>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </TrackingRow>
              </TrackingSection>

              <TrackingSection title="Geo hints">
                <TrackingRow label="Country / region">
                  {dash(trackingUser.geo_country)}
                </TrackingRow>
                <TrackingRow label="City">
                  {dash(trackingUser.geo_city)}
                </TrackingRow>
                <TrackingRow label="Timezone">
                  {dash(trackingUser.geo_timezone)}
                </TrackingRow>
              </TrackingSection>

              <TrackingSection title="Recent IP history">
                <TrackingRow label="Snapshots">
                  <ChipList items={trackingUser.ip_history} />
                </TrackingRow>
              </TrackingSection>

              <TrackingSection title="Recent device history">
                <TrackingRow label="Snapshots">
                  <ChipList items={trackingUser.device_history} />
                </TrackingRow>
              </TrackingSection>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => setTrackingUser(null)}
              className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={modConfirm != null}
        onClose={() => {
          setModConfirm(null);
          setModError(null);
        }}
        title={
          modConfirm?.kind === "ban"
            ? "Ban this user on all games?"
            : modConfirm?.kind === "unban"
              ? "Remove global ban?"
              : "Remove wager limits on all games?"
        }
        description={
          <div className="space-y-3">
            <p>
              <span className="font-medium text-zinc-200">
                {modConfirm?.user.username}
              </span>
            </p>
            {(modConfirm?.kind === "ban" || modConfirm?.kind === "unban") && (
              <label className="block text-left">
                <span className="text-xs text-zinc-500">Note (optional)</span>
                <textarea
                  value={modNote}
                  onChange={(e) => setModNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
                />
              </label>
            )}
          </div>
        }
        confirmLabel={
          modConfirm?.kind === "ban"
            ? "Ban everywhere"
            : modConfirm?.kind === "unban"
              ? "Unban"
              : "Remove limits"
        }
        variant={modConfirm?.kind === "ban" ? "danger" : "primary"}
        errorText={modError}
        onConfirm={async () => {
          if (!modConfirm) return;
          setModError(null);
          const map = {
            ban: "BAN" as const,
            unban: "UNBAN" as const,
            unlimit: "UNLIMIT" as const,
          };
          try {
            await postAdminUserGlobalModerationApi(modConfirm.user.username, {
              action: map[modConfirm.kind],
              note: modNote.trim() || undefined,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Request failed";
            setModError(msg);
            throw e;
          }
          setActionMsg(
            `${modConfirm.kind === "ban" ? "Banned" : modConfirm.kind === "unban" ? "Unbanned" : "Unlimited"} ${modConfirm.user.username}.`,
          );
          void load({ background: true });
        }}
      />

      <Modal
        isOpen={limitUser != null}
        onClose={() => {
          if (!limitBusy) {
            setLimitUser(null);
            setLimitError(null);
          }
        }}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900 p-0"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-zinc-100">
            Global wager limit
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Applies the same max bet to Dice, Mines, and Crash, and max wager
            to Coinflip. Optional hourly cap for Mines and Coinflip.
          </p>
          {limitUser ? (
            <p className="mt-2 text-sm font-medium text-zinc-200">
              {limitUser.username}
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs text-zinc-500">Max bet / wager</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={limitBet}
                onChange={(e) => setLimitBet(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">
                Max games / hour (optional)
              </span>
              <input
                type="number"
                min="1"
                value={limitPerHour}
                onChange={(e) => setLimitPerHour(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Note (optional)</span>
              <textarea
                value={limitNote}
                onChange={(e) => setLimitNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
              />
            </label>
          </div>
          {limitError ? (
            <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {limitError}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={limitBusy}
              onClick={() => setLimitUser(null)}
              className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={limitBusy}
              onClick={() => {
                void (async () => {
                  if (!limitUser) return;
                  const n = Number(limitBet);
                  if (!Number.isFinite(n) || n <= 0) {
                    setLimitError("Enter a positive max bet.");
                    return;
                  }
                  setLimitBusy(true);
                  setLimitError(null);
                  try {
                    const hourlyRaw = limitPerHour.trim();
                    let hourly: number | undefined;
                    if (hourlyRaw !== "") {
                      const h = Number(hourlyRaw);
                      if (!Number.isFinite(h) || h < 1) {
                        throw new Error(
                          "Hourly cap must be a positive integer.",
                        );
                      }
                      hourly = Math.floor(h);
                    }
                    await postAdminUserGlobalModerationApi(limitUser.username, {
                      action: "LIMIT",
                      maxBetAmount: n,
                      maxGamesPerHour: hourly,
                      note: limitNote.trim() || undefined,
                    });
                    setActionMsg(`Limited ${limitUser.username} on all games.`);
                    setLimitUser(null);
                    void load({ background: true });
                  } catch (e) {
                    setLimitError(
                      e instanceof Error ? e.message : "Request failed",
                    );
                  } finally {
                    setLimitBusy(false);
                  }
                })();
              }}
              className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
            >
              {limitBusy ? "Please wait…" : "Apply limit"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editUser != null}
        onClose={() => {
          if (!editBusy) {
            setEditUser(null);
            setEditError(null);
          }
        }}
        className="mx-4 max-w-lg border border-zinc-800 bg-zinc-900 p-0"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-zinc-100">
            Edit user fields
          </h2>
          {editUser ? (
            <div className="mt-1 space-y-0.5 text-sm text-zinc-500">
              <p className="font-medium text-zinc-200">{editUser.username}</p>
              <p className="text-xs">
                Current: balance {formatMoney(Number(editUser.balance))} ·
                wagered {formatMoney(Number(editUser.total_wagered))} · XP{" "}
                {(editUser.total_xp ?? 0).toLocaleString()} · level{" "}
                {editUser.current_level ?? 1}
              </p>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-zinc-500">
            For each pair (balance / wagered / XP), use either set or adjust, not
            both. All changes are audited.
          </p>
          {editShowsInstantOverwrite ? (
            <p className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
              <span className="font-semibold text-amber-200">
                Direct overwrite:
              </span>{" "}
              You are replacing stored values in one shot. That can mask
              accounting mistakes or desync XP from level rules. Prefer{" "}
              <span className="font-medium">adjust (+/−)</span> for small
              corrections unless you intentionally need an exact total.
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">Set balance</span>
              <input
                value={editBalanceSet}
                onChange={(e) => setEditBalanceSet(e.target.value)}
                placeholder="e.g. 100.00 — replaces balance"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">Adjust balance (+/−)</span>
              <input
                value={editBalanceDelta}
                onChange={(e) => setEditBalanceDelta(e.target.value)}
                placeholder="e.g. -10 or 25"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">
                Set total wagered (replaces)
              </span>
              <input
                value={editWagerSet}
                onChange={(e) => setEditWagerSet(e.target.value)}
                placeholder="Absolute total, e.g. 1500.00"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">
                Adjust wagered (+/−)
              </span>
              <input
                value={editWagerDelta}
                onChange={(e) => setEditWagerDelta(e.target.value)}
                placeholder="e.g. 50 or -25.5"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">Role</span>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">
                Set total XP (replaces)
              </span>
              <input
                value={editXpSet}
                onChange={(e) => setEditXpSet(e.target.value)}
                placeholder="e.g. 12000"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">Adjust XP (+/−)</span>
              <input
                value={editXpDelta}
                onChange={(e) => setEditXpDelta(e.target.value)}
                placeholder="e.g. 500 or -250"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-500">
                Level (set only — replaces)
              </span>
              <input
                value={editLevel}
                onChange={(e) => setEditLevel(e.target.value)}
                placeholder="Optional; integer ≥ 1"
                className="mt-1 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            </label>
          </div>
          {editError ? (
            <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {editError}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={editBusy}
              onClick={() => setEditUser(null)}
              className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={editBusy}
              onClick={() => void submitEdit()}
              className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {editBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={chatBanTarget != null}
        onClose={() => {
          if (!chatBanBusy) {
            setChatBanTarget(null);
            setChatBanError(null);
          }
        }}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900 p-0"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-zinc-100">
            Ban from live chat
          </h2>
          {chatBanTarget ? (
            <p className="mt-1 font-mono text-sm text-zinc-400">
              {chatBanTarget.username}
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Same Redis list as in-game staff{" "}
            <span className="font-mono text-zinc-400">/ban</span>. Moderators
            without ban permission receive an error from the API.
          </p>
          <label className="mt-4 block">
            <span className="text-xs text-zinc-500">Reason</span>
            <textarea
              value={chatBanReason}
              onChange={(e) => setChatBanReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              placeholder="Shown to the user when they try to send a message"
            />
          </label>
          <fieldset className="mt-4 space-y-2">
            <legend className="text-xs font-medium text-zinc-500">
              Duration
            </legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="chatBanDur"
                checked={chatBanPermanent}
                onChange={() => setChatBanPermanent(true)}
                className="border-zinc-600"
              />
              Permanent
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name="chatBanDur"
                checked={!chatBanPermanent}
                onChange={() => setChatBanPermanent(false)}
                className="border-zinc-600"
              />
              Temporary (hours)
            </label>
            {!chatBanPermanent ? (
              <input
                type="number"
                step={0.25}
                min={0.01}
                value={chatBanHours}
                onChange={(e) => setChatBanHours(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              />
            ) : null}
          </fieldset>
          {chatBanError ? (
            <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {chatBanError}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={chatBanBusy}
              onClick={() => {
                setChatBanTarget(null);
                setChatBanError(null);
              }}
              className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={chatBanBusy}
              className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => {
                void (async () => {
                  if (!chatBanTarget) return;
                  const r = chatBanReason.trim();
                  if (!r) {
                    setChatBanError("Reason is required.");
                    return;
                  }
                  let durationMinutes: number | null = null;
                  if (!chatBanPermanent) {
                    const h = Number(chatBanHours);
                    if (!Number.isFinite(h) || h <= 0) {
                      setChatBanError("Enter a positive duration in hours.");
                      return;
                    }
                    durationMinutes = Math.max(1, Math.round(h * 60));
                  }
                  setChatBanBusy(true);
                  setChatBanError(null);
                  try {
                    await postAdminUserChatBanApi(chatBanTarget.id, {
                      reason: r,
                      durationMinutes,
                    });
                    const uname = chatBanTarget.username;
                    setChatBanTarget(null);
                    setToast({
                      kind: "ok",
                      message: `Chat banned: ${uname}`,
                    });
                    void load({ background: true });
                  } catch (e) {
                    setChatBanError(
                      e instanceof Error ? e.message : "Request failed",
                    );
                  } finally {
                    setChatBanBusy(false);
                  }
                })();
              }}
            >
              {chatBanBusy ? "Applying…" : "Apply chat ban"}
            </button>
          </div>
        </div>
      </Modal>

      {toast ? (
        <div
          className={cn(
            "fixed right-6 bottom-6 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg",
            toast.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-950/95 text-emerald-100"
              : "border-rose-500/40 bg-rose-950/95 text-rose-100",
          )}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
