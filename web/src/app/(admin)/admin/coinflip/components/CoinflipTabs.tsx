"use client";

import { cn } from "./cn";

export interface CoinflipTab {
  id: string;
  label: string;
}

interface CoinflipTabsProps {
  tabs: CoinflipTab[];
  active: string;
  onChange: (id: string) => void;
}

export function CoinflipTabs({ tabs, active, onChange }: CoinflipTabsProps) {
  return (
    <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/50 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:text-sm",
            active === t.id
              ? "bg-gradient-to-r from-sky-600/90 to-blue-600/85 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
