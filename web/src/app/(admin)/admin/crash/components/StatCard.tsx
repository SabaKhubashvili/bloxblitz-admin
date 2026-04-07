"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { Skeleton } from "./Skeleton";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  icon?: ReactNode;
  trend?: { label: string; positive: boolean };
}

export function StatCard({
  label,
  value,
  hint,
  loading,
  icon,
  trend,
}: StatCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5",
          "transition-transform duration-300 hover:-translate-y-0.5 hover:border-zinc-700"
        )}
      >
        <Skeleton className="mb-3 h-3 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 p-5",
        "shadow-md shadow-black/20 transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        {icon ? (
          <span className="text-zinc-600 transition-colors group-hover:text-emerald-500/80">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-100">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      {trend ? (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            trend.positive ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {trend.label}
        </p>
      ) : null}
    </div>
  );
}
