"use client";

import { cn } from "./cn";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950/95 p-5 shadow-lg shadow-black/25",
        "transition-all duration-300 hover:border-amber-500/15 hover:shadow-amber-500/5"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-zinc-100 sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
