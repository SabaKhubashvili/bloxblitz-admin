"use client";

import { cn } from "./cn";

export function FraudTierBadge({ tier }: { tier: string }) {
  const t = tier.toLowerCase();
  const cls =
    t === "critical"
      ? "bg-rose-500/20 text-rose-200 border-rose-500/40"
      : t === "limited"
        ? "bg-amber-500/20 text-amber-100 border-amber-500/40"
        : t === "flagged"
          ? "bg-sky-500/20 text-sky-100 border-sky-500/40"
          : "bg-zinc-600/30 text-zinc-300 border-zinc-500/40";

  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        cls
      )}
    >
      {tier}
    </span>
  );
}
