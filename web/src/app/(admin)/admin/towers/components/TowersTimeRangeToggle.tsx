"use client";

import type { TowersTimeRange } from "../types";
import { cn } from "../../dice/components/cn";

const OPTIONS: { value: TowersTimeRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

export function TowersTimeRangeToggle({
  value,
  onChange,
}: {
  value: TowersTimeRange;
  onChange: (v: TowersTimeRange) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-1 shadow-inner">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            value === opt.value
              ? "bg-gradient-to-r from-violet-600/90 to-fuchsia-600/85 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
