"use client";

import { cn } from "./cn";

interface GridPreviewProps {
  gridSize: number;
  cells: (boolean | null)[];
  className?: string;
  /** Pulse hidden tiles (live feel) */
  animateHidden?: boolean;
}

export function GridPreview({
  gridSize,
  cells,
  className,
  animateHidden = true,
}: GridPreviewProps) {
  const n = gridSize * gridSize;
  const safe = cells.length >= n ? cells.slice(0, n) : [...cells, ...Array(n - cells.length).fill(null)];

  return (
    <div
      className={cn("inline-grid gap-1 p-2", className)}
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
      }}
    >
      {safe.map((cell, i) => (
        <div
          key={i}
          className={cn(
            "flex aspect-square min-h-[22px] min-w-[22px] items-center justify-center rounded-md border text-[10px] font-bold transition-all duration-300 sm:min-h-[26px] sm:min-w-[26px]",
            cell === true &&
              "border-emerald-500/50 bg-emerald-500/25 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
            cell === false &&
              "border-rose-500/60 bg-rose-600/35 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.35)]",
            cell === null &&
              "border-zinc-700 bg-zinc-800/80 text-transparent",
            cell === null &&
              animateHidden &&
              "animate-pulse"
          )}
        >
          {cell === true ? "✓" : cell === false ? "✕" : ""}
        </div>
      ))}
    </div>
  );
}
