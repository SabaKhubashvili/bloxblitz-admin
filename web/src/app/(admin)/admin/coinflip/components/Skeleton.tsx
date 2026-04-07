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
