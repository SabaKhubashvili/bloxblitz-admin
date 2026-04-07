"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { Skeleton } from "./Skeleton";

export function StatCard({
  label,
  value,
  hint,
  loading,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  icon?: ReactNode;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <Skeleton className="mb-3 h-3 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "group rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 p-5 shadow-md transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-sky-500/25 hover:shadow-sky-500/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-zinc-100">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
