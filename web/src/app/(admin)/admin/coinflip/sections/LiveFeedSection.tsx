"use client";

import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { useCoinflipAdmin } from "../context/CoinflipAdminContext";
import { useLiveFeed } from "../hooks/useLiveFeed";
import type { FeedEventType } from "../mock/types";
import { cn } from "../components/cn";

const TYPE_COLOR: Record<FeedEventType, string> = {
  created: "text-sky-400",
  joined: "text-blue-400",
  resolved: "text-emerald-400",
  cancelled: "text-rose-400",
  system: "text-zinc-400",
};

export function LiveFeedSection() {
  const { systemPaused } = useCoinflipAdmin();
  const { items } = useLiveFeed(!systemPaused, 2800, 28);

  return (
    <section id="feed" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Live activity</h2>
        <p className="text-sm text-zinc-500">
          Simulated stream — pauses when system is paused.
        </p>
      </div>

      <CoinflipPanelCard>
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm transition-all duration-300",
                item.highlight
                  ? "border-amber-500/40 bg-amber-500/10 shadow-md shadow-amber-900/20"
                  : "border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    TYPE_COLOR[item.type]
                  )}
                >
                  {item.type}
                </span>
                <time className="font-mono text-xs text-zinc-600">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </time>
              </div>
              <p className="mt-1 text-zinc-300">{item.message}</p>
            </li>
          ))}
        </ul>
      </CoinflipPanelCard>
    </section>
  );
}
