"use client";

import type { LeaderboardEntry } from "../mock/types";
import { formatMoney } from "./formatMoney";
import { cn } from "./cn";

const GOLD = "#FFD700";
const SILVER = "#C0C0C0";
const BRONZE = "#CD7F32";

function rankStyle(rank: number) {
  if (rank === 1)
    return {
      row: "border-amber-500/35 bg-gradient-to-r from-[#FFD700]/10 via-zinc-900/40 to-zinc-900/30 shadow-[0_0_24px_-10px_rgba(255,215,0,0.35)]",
      badge: "text-[#FFD700] border-[#FFD700]/40 bg-[#FFD700]/10",
    };
  if (rank === 2)
    return {
      row: "border-zinc-400/30 bg-gradient-to-r from-[#C0C0C0]/10 via-zinc-900/40 to-zinc-900/30",
      badge: "text-[#C0C0C0] border-[#C0C0C0]/40 bg-[#C0C0C0]/10",
    };
  if (rank === 3)
    return {
      row: "border-orange-700/35 bg-gradient-to-r from-[#CD7F32]/12 via-zinc-900/40 to-zinc-900/30",
      badge: "text-[#CD7F32] border-[#CD7F32]/40 bg-[#CD7F32]/10",
    };
  return {
    row: "border-zinc-800/80 bg-zinc-900/25",
    badge: "text-zinc-400 border-zinc-700 bg-zinc-950/50",
  };
}

export function LeaderboardTable({
  entries,
  animated,
  emptyMessage = "No entries yet.",
}: {
  entries: LeaderboardEntry[];
  animated?: boolean;
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 py-16 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/90 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3 text-right">Wagered</th>
            <th className="px-4 py-3 text-right">Reward</th>
            {animated ? (
              <th className="px-4 py-3 text-center">Δ</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {entries.map((e) => {
            const rs = rankStyle(e.rank);
            const moved =
              animated &&
              e.prevRank !== undefined &&
              e.prevRank !== e.rank;
            const up = moved && e.prevRank !== undefined && e.rank < e.prevRank;
            const down = moved && e.prevRank !== undefined && e.rank > e.prevRank;
            return (
              <tr
                key={e.userId}
                className={cn(
                  "border-l-2 transition-all duration-500 ease-out",
                  rs.row,
                  animated && moved && "motion-safe:animate-pulse motion-safe:duration-700"
                )}
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-lg border font-mono text-sm font-bold",
                      rs.badge
                    )}
                    style={
                      e.rank === 1
                        ? { boxShadow: `0 0 20px -6px ${GOLD}` }
                        : e.rank === 2
                          ? { boxShadow: `0 0 16px -8px ${SILVER}` }
                          : e.rank === 3
                            ? { boxShadow: `0 0 16px -8px ${BRONZE}` }
                            : undefined
                    }
                  >
                    {e.rank}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-zinc-200">
                  {e.username}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {formatMoney(e.wagered)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400/90">
                  {formatMoney(e.potentialReward)}
                </td>
                {animated ? (
                  <td className="px-4 py-3 text-center">
                    {!moved ? (
                      <span className="text-zinc-600">—</span>
                    ) : up ? (
                      <span className="text-xs font-semibold text-emerald-400">
                        ▲ {e.prevRank! - e.rank}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-400">
                        ▼ {e.rank - e.prevRank!}
                      </span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
