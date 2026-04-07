"use client";

import { CasesPanelCard } from "../components/CasesPanelCard";
import { formatMoney } from "../components/formatMoney";
import { useRecentCaseOpens } from "../hooks/useRecentCaseOpens";
import { cn } from "../components/cn";

function formatOpenedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function ActivitySection() {
  const { data, isPending, isError, error, refetch } = useRecentCaseOpens();
  const rows = data?.opens ?? [];

  return (
    <section id="activity" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Recent opens
        </h2>
        <p className="text-sm text-zinc-500">
          Latest case openings across all cases (UTC).
        </p>
      </div>

      {isError ? (
        <CasesPanelCard title="Could not load recent opens">
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
          >
            Retry
          </button>
        </CasesPanelCard>
      ) : null}

      {!isError && isPending ? (
        <CasesPanelCard flush>
          <div className="divide-y divide-zinc-800/80 px-4 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 py-3"
                aria-hidden
              >
                <div className="h-4 flex-1 animate-pulse rounded bg-zinc-800/80" />
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-800/80" />
              </div>
            ))}
          </div>
        </CasesPanelCard>
      ) : null}

      {!isError && !isPending && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No opens recorded yet.</p>
      ) : null}

      {!isError && !isPending && rows.length > 0 ? (
        <CasesPanelCard flush>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Case</th>
                  <th className="px-4 py-3">Item won</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3">Time (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="bg-zinc-900/30 hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-2.5 text-zinc-300">
                      {r.username}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">
                      {r.caseName}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-zinc-200">
                      {r.itemWon}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-mono text-sm tabular-nums",
                        r.itemValue >= 20
                          ? "text-amber-300"
                          : r.itemValue >= 5
                            ? "text-emerald-400"
                            : "text-zinc-500"
                      )}
                    >
                      {formatMoney(r.itemValue)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                      {formatOpenedAt(r.openedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CasesPanelCard>
      ) : null}
    </section>
  );
}
