"use client";

import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { CoinflipUserModerationActions } from "../components/CoinflipUserModerationActions";
import { FraudTierBadge } from "../components/FraudTierBadge";
import { UserRiskProfileModal } from "../components/UserRiskProfileModal";
import { cn } from "../components/cn";
import { useSuspiciousUsers } from "../hooks/useSuspiciousUsers";
import { useCoinflipPlayersModerationMap } from "../hooks/useCoinflipPlayersModerationMap";
import { formatBannedUntilUtc, formatRemainingBanLabel } from "../lib/format-coinflip-ban";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE = 25;
const FILTER_DEBOUNCE_MS = 400;

export function SuspiciousUsersSection() {
  const [minInput, setMinInput] = useState("0");
  const [maxInput, setMaxInput] = useState("100");
  const [debounced, setDebounced] = useState({ min: 0, max: 100 });
  const [offset, setOffset] = useState(0);
  const [profileUser, setProfileUser] = useState<string | null>(null);

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

  const query = useSuspiciousUsers({
    minScore: debounced.min,
    maxScore: debounced.max,
    offset,
    limit: PAGE,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const suspiciousUsernames = useMemo(
    () => items.map((r) => r.username),
    [items],
  );
  const moderationMap = useCoinflipPlayersModerationMap(suspiciousUsernames);
  const loadError =
    query.isError && query.error instanceof Error
      ? query.error.message
      : query.isError
        ? "Failed to load suspicious users"
        : null;

  const maxOffset = Math.max(0, total - PAGE);
  const pageEnd = Math.min(offset + items.length, offset + PAGE);

  const refetch = useCallback(() => void query.refetch(), [query]);

  return (
    <>
      <section id="fraud-users" className="scroll-mt-28 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Fraud · Suspicious users
          </h2>
          <p className="text-sm text-zinc-500">
            Redis-backed risk scores after each settled game (admin-api must consume the
            same Redis stream as game WS). Fair play usually stays at{" "}
            <span className="font-mono text-zinc-400">0</span>; win-rate / EV signals need
            roughly 25–30+ games before they contribute. Use min score{" "}
            <span className="font-mono text-zinc-400">12</span> or higher to focus on
            elevated risk only. Auto-refreshes ~18s.
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
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3">Confidence</th>
                  <th className="px-3 py-3">Tier</th>
                  <th className="px-3 py-3">Games</th>
                  <th className="px-3 py-3">Win rate</th>
                  <th className="px-3 py-3 min-w-[200px]">Signals</th>
                  <th className="px-3 py-3 min-w-[140px]">Coinflip mod</th>
                  <th className="px-3 py-3 min-w-[200px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {query.isPending && items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      No users in this score range. If you expected rows after playing,
                      confirm admin-api Redis matches the game server, stream key{" "}
                      <span className="font-mono text-zinc-400">cf:fraud:stream</span>, and
                      payouts emit <span className="font-mono text-zinc-400">payout_completed</span>
                      .
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const highlight =
                      row.riskScore >= 50 ||
                      row.tier.toLowerCase() === "critical";
                    return (
                      <tr
                        key={row.username}
                        className={cn(
                          highlight && "bg-rose-950/15",
                          "hover:bg-zinc-900/50",
                        )}
                      >
                        <td className="px-3 py-2 font-mono text-zinc-200">
                          {row.username}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-100">
                          {row.riskScore.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-300">
                          {row.confidence}
                        </td>
                        <td className="px-3 py-2">
                          <FraudTierBadge tier={row.tier} />
                        </td>
                        <td className="px-3 py-2 text-zinc-400">
                          {row.games}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-400">
                          {row.winRate}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex max-w-md flex-wrap gap-1">
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
                        <td className="px-3 py-2 align-top text-xs">
                          <SuspiciousUserModCell
                            username={row.username}
                            moderationMap={moderationMap}
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              className="w-max rounded-lg border border-zinc-600 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                              onClick={() => setProfileUser(row.username)}
                            >
                              View profile
                            </button>
                            <CoinflipUserModerationActions
                              username={row.username}
                              detail={moderationMap.byUser.get(row.username)}
                              isLoading={
                                moderationMap.getState(row.username).isPending
                              }
                              isError={
                                moderationMap.getState(row.username).isError
                              }
                              onAfterMutation={() => {
                                void query.refetch();
                                void moderationMap.refetchAll();
                              }}
                            />
                          </div>
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

      <UserRiskProfileModal
        username={profileUser}
        isOpen={!!profileUser}
        onClose={() => setProfileUser(null)}
      />
    </>
  );
}

function SuspiciousUserModCell({
  username,
  moderationMap,
}: {
  username: string;
  moderationMap: ReturnType<typeof useCoinflipPlayersModerationMap>;
}) {
  const st = moderationMap.getState(username);
  const d = st.data;
  if (st.isPending && !d) {
    return <span className="text-zinc-600">…</span>;
  }
  if (st.isError && !d) {
    return <span className="text-rose-400">Error</span>;
  }
  if (!d) return <span className="text-zinc-600">—</span>;

  const pill =
    d.status === "banned"
      ? "text-rose-300"
      : d.status === "limited"
        ? "text-amber-200"
        : "text-zinc-400";
  return (
    <div className="max-w-[200px] space-y-1">
      <div className={cn("font-semibold uppercase tracking-wide", pill)}>
        {d.status}
      </div>
      {d.status === "banned" && d.banUntilIso ? (
        <>
          <div className="font-mono text-[10px] leading-snug text-zinc-500">
            Until {formatBannedUntilUtc(d.banUntilIso)}
          </div>
          <div className="text-[10px] text-amber-200/80">
            {formatRemainingBanLabel(d.banUntilIso)}
          </div>
        </>
      ) : d.status === "banned" ? (
        <div className="text-[10px] text-zinc-600">
          Expiry not on fraud profile
        </div>
      ) : null}
      {d.note ? (
        <div className="line-clamp-2 text-[10px] text-zinc-600" title={d.note}>
          {d.note}
        </div>
      ) : null}
    </div>
  );
}
