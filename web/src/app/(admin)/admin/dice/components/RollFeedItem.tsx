"use client";

import type { DiceLiveRoll } from "../mock/types";
import { formatMoney } from "./formatMoney";
import { cn } from "./cn";

const BIG_WIN = 2500;

export function RollFeedItem({ roll }: { roll: DiceLiveRoll }) {
  const rolling = roll.won === null;
  const bigWin =
    !rolling &&
    roll.won === true &&
    roll.bet * Math.max(roll.multiplier, 0) >= BIG_WIN;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-all duration-500",
        rolling &&
          "border-sky-500/40 bg-gradient-to-r from-sky-950/50 to-zinc-900/80 shadow-[0_0_24px_-8px_rgba(56,189,248,0.35)]",
        !rolling && roll.won === true &&
          "border-emerald-500/35 bg-emerald-950/20",
        !rolling && roll.won === false &&
          "border-rose-500/35 bg-rose-950/15",
        bigWin &&
          "ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/15"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border text-lg font-bold",
              rolling
                ? "border-sky-500/50 bg-sky-950/40 text-sky-300"
                : roll.won === true
                  ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                  : "border-rose-500/40 bg-rose-950/30 text-rose-300"
            )}
          >
            <span
              className={cn(
                "tabular-nums",
                rolling && "animate-pulse motion-reduce:animate-none"
              )}
            >
              {rolling ? "⚀" : roll.result?.toFixed(2) ?? "—"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-200">{roll.username}</p>
            <p className="text-xs text-zinc-500">
              {roll.side === "over" ? "Roll over" : "Roll under"}{" "}
              <span className="font-mono text-sky-400/90">
                {roll.target.toFixed(2)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-xs uppercase text-zinc-500">Bet</p>
            <p className="font-mono text-zinc-200">{formatMoney(roll.bet)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-zinc-500">×</p>
            <p className="font-mono text-sky-300">
              {rolling ? "—" : `${roll.multiplier.toFixed(2)}×`}
            </p>
          </div>
          <div
            className={cn(
              "min-w-[5.5rem] text-right font-mono text-sm font-semibold",
              rolling && "text-sky-300",
              !rolling && roll.won === true && "text-emerald-400",
              !rolling && roll.won === false && "text-rose-400"
            )}
          >
            {rolling ? (
              <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide">
                <span className="size-1.5 animate-bounce rounded-full bg-sky-400" />
                Rolling
              </span>
            ) : roll.won === true ? (
              `+${formatMoney(roll.bet * roll.multiplier - roll.bet)}`
            ) : (
              formatMoney(-roll.bet)
            )}
          </div>
        </div>
      </div>
      {bigWin ? (
        <p className="mt-2 text-xs font-medium text-amber-400/90">
          Big win — high payout
        </p>
      ) : null}
    </div>
  );
}
