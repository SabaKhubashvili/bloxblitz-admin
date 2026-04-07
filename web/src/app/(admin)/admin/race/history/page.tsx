"use client";

import { RaceAdminShell } from "../components/RaceAdminShell";
import { formatCompact, formatMoney } from "../components/formatMoney";
import { useRaceAdmin } from "../context/RaceAdminContext";
import { prizePool } from "../mock/data";
import type { Race } from "../mock/types";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "../components/cn";

function statusLabel(r: Race) {
  if (r.status === "ended") return "Completed";
  if (r.status === "cancelled") return "Cancelled";
  return r.status.charAt(0).toUpperCase() + r.status.slice(1);
}

export default function RaceHistoryPage() {
  const { pastRaces, loading, error, refreshHistory } = useRaceAdmin();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pastRaces;
    return pastRaces.filter((r) => r.name.toLowerCase().includes(s));
  }, [pastRaces, q]);

  return (
    <RaceAdminShell title="Race history">
      <header className="mb-8 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Race history
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Completed and cancelled races from the admin API.
        </p>
        <button
          type="button"
          onClick={() => void refreshHistory()}
          className="mt-4 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Refresh list
        </button>
      </header>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="mb-4">
        <input
          type="search"
          placeholder="Filter by race name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/90 text-xs uppercase text-zinc-500">
              <th className="px-4 py-3">Race</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3 text-right">Prize pool</th>
              <th className="px-4 py-3 text-right">Participants</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  Loading…
                </td>
              </tr>
            ) : !loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  No races in history yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="bg-zinc-900/30">
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(r.startTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(r.endTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-200/90">
                    {formatMoney(prizePool(r))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {formatCompact(r.totalParticipants)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        r.status === "ended" && "bg-zinc-800 text-zinc-400",
                        r.status === "cancelled" &&
                          "bg-rose-500/15 text-rose-300",
                      )}
                    >
                      {statusLabel(r)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/race/${r.id}`}
                      className="text-sm font-medium text-amber-500/90 hover:text-amber-400"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </RaceAdminShell>
  );
}
