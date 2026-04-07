"use client";

import { cn } from "./cn";

interface PlayerBadgeProps {
  username: string;
  sub?: string;
  className?: string;
  size?: "sm" | "md";
}

export function PlayerBadge({
  username,
  sub,
  className,
  size = "md",
}: PlayerBadgeProps) {
  const initial = username.trim().slice(0, 1).toUpperCase() || "?";
  const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-600/80 to-blue-700/80 font-bold text-white ring-2 ring-zinc-800",
          dim
        )}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-100">{username}</p>
        {sub ? (
          <p className="truncate font-mono text-xs text-sky-400/90">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}
