"use client";

import type { TimeRange } from "../mock/types";
import { cn } from "./cn";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  return (
    <div
      className="inline-flex rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-1 shadow-inner"
      role="group"
      aria-label="Time range"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
            value === opt.value
              ? "bg-gradient-to-r from-violet-600/90 to-fuchsia-600/80 text-white shadow-md shadow-violet-900/40"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
