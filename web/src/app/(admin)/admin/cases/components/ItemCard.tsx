"use client";

import type { CaseRewardItem } from "../mock/types";
import { formatMoney } from "./formatMoney";
import { RARITY_LABEL, RARITY_RING } from "./rarityStyles";
import { cn } from "./cn";

interface ItemCardProps {
  item: CaseRewardItem;
  compact?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function ItemCard({ item, compact, onRemove, className }: ItemCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-zinc-950/50 p-3 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg",
        RARITY_RING[item.rarity],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-zinc-800",
            compact ? "h-12 w-12 text-lg" : "h-14 w-14 text-xl"
          )}
        >
          {item.imageUrl ? "🖼" : "📦"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-100">{item.name}</p>
          <p className="mt-0.5 font-mono text-sm text-emerald-400/90">
            {formatMoney(item.value)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                RARITY_LABEL[item.rarity]
              )}
            >
              {item.rarity}
            </span>
            <span className="font-mono text-xs text-zinc-500">
              {item.dropChance}% drop
            </span>
          </div>
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1 text-zinc-500 opacity-0 transition-opacity hover:bg-rose-500/20 hover:text-rose-400 group-hover:opacity-100"
            aria-label="Remove item"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
