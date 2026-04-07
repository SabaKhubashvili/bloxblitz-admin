"use client";

import { formatMoney } from "../components/formatMoney";
import { PanelCard } from "../components/PanelCard";
import { RollFeedItem } from "../components/RollFeedItem";
import { useDiceAdmin } from "../context/DiceAdminContext";
import { useDiceBettingStatus } from "../hooks/useDiceBetting";
import { tickDiceLiveRolls } from "../mock/data";
import { useEffect } from "react";
import { cn } from "../components/cn";

export function LiveRollsSection() {
  const { liveRolls, systemPaused, updateLiveRolls } = useDiceAdmin();
  const { data } = useDiceBettingStatus();
  const bettingDisabled = data?.bettingDisabled ?? false;

  useEffect(() => {
    if (systemPaused) return;
    const id = window.setInterval(() => {
      updateLiveRolls((prev) => tickDiceLiveRolls(prev));
    }, 1900);
    return () => window.clearInterval(id);
  }, [systemPaused, updateLiveRolls]);

  const totalBet = liveRolls.reduce((s, r) => s + r.bet, 0);
  const rolling = liveRolls.filter((r) => r.won === null).length;

  return (
    <section id="live" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Live rolls</h2>
        <p className="text-sm text-zinc-500">
          Simulated stream — green wins, red losses, blue while rolling.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PanelCard>
          <p className="text-xs uppercase text-zinc-500">In flight</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-sky-300">
            {rolling}
          </p>
        </PanelCard>
        <PanelCard>
          <p className="text-xs uppercase text-zinc-500">Open stake</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-100">
            {formatMoney(totalBet)}
          </p>
        </PanelCard>
        <PanelCard>
          <p className="text-xs uppercase text-zinc-500">Feed status</p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              systemPaused
                ? "text-rose-400"
                : bettingDisabled
                  ? "text-amber-400"
                  : "text-emerald-400"
            )}
          >
            {systemPaused
              ? "Paused"
              : bettingDisabled
                ? "Betting off"
                : "Streaming"}
          </p>
        </PanelCard>
      </div>

      {liveRolls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 py-14 text-center text-sm text-zinc-500">
          No live rolls — resume game or use Debug to seed the feed.
        </div>
      ) : (
        <div className="space-y-3">
          {liveRolls.map((r) => (
            <RollFeedItem key={r.id} roll={r} />
          ))}
        </div>
      )}
    </section>
  );
}
