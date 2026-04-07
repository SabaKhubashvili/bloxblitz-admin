"use client";

import { cn } from "./cn";

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-zinc-800/80 ring-1 ring-zinc-700/50",
        className
      )}
      {...rest}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
