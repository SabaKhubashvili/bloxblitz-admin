"use client";

import { formatCompact, formatMoney } from "../components/formatMoney";
import { CrashCard } from "../components/CrashCard";
import { useLiveCrashStats } from "../hooks/useLiveCrashStats";
import { cn } from "../components/cn";

interface LiveMonitoringSectionProps {
  frozen: boolean;
  bettingDisabled: boolean;
}

export function LiveMonitoringSection({
  frozen,
  bettingDisabled,
}: LiveMonitoringSectionProps) {
  const stats = useLiveCrashStats(frozen || bettingDisabled);

  const plPositive = stats.profitLoss >= 0;

  return (
    <section id="live" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Live monitoring
          </h2>
          <p className="text-sm text-zinc-500">
            Simulated tick — replace with WebSocket feed.
          </p>
        </div>
        {bettingDisabled ? (
          <span className="rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            Betting disabled (mock)
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <CrashCard
          className="relative overflow-hidden sm:col-span-2 lg:col-span-1 xl:col-span-1"
          title="Current multiplier"
          subtitle={frozen ? "Paused" : "Live mock"}
        >
          <div
            className={cn(
              "font-mono text-4xl font-bold tabular-nums tracking-tight transition-colors duration-500",
              frozen ? "text-zinc-500" : "text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.35)]"
            )}
          >
            {stats.multiplier.toFixed(2)}×
          </div>
        </CrashCard>

        <MetricTile label="Total bets" value={formatMoney(stats.totalBets)} />
        <MetricTile
          label="Total payout"
          value={formatMoney(stats.totalPayout)}
        />
        <MetricTile
          label="Profit / loss"
          value={formatMoney(stats.profitLoss)}
          valueClass={plPositive ? "text-emerald-400" : "text-rose-400"}
        />
        <MetricTile
          label="Active players"
          value={formatCompact(stats.activePlayers)}
        />
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <CrashCard>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-xl font-semibold tabular-nums text-zinc-100 transition-all duration-500",
          valueClass
        )}
      >
        {value}
      </p>
    </CrashCard>
  );
}
