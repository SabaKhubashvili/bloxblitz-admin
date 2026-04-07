"use client";

import { formatMoney } from "../components/formatMoney";
import { GridPreview } from "../components/GridPreview";
import { MinesPanelCard } from "../components/MinesPanelCard";
import { useMinesAdmin } from "../context/MinesAdminContext";
import { tickLiveGames } from "../mock/data";
import { useEffect } from "react";
import { cn } from "../components/cn";

const BIG = 400;

export function LiveMonitoringSection() {
  const { liveGames, systemPaused, updateLiveGames } = useMinesAdmin();

  useEffect(() => {
    if (systemPaused) return;
    const id = window.setInterval(() => {
      updateLiveGames((prev) => tickLiveGames(prev));
    }, 2600);
    return () => window.clearInterval(id);
  }, [systemPaused, updateLiveGames]);

  const totalBet = liveGames.reduce((s, g) => s + g.bet, 0);

  return (
    <section id="live" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Live games</h2>
        <p className="text-sm text-zinc-500">
          Mock tick reveals safe tiles — pauses when system paused.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MinesPanelCard>
          <p className="text-xs uppercase text-zinc-500">Active</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-100">
            {liveGames.length}
          </p>
        </MinesPanelCard>
        <MinesPanelCard>
          <p className="text-xs uppercase text-zinc-500">Current bets</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-300">
            {formatMoney(totalBet)}
          </p>
        </MinesPanelCard>
        <MinesPanelCard>
          <p className="text-xs uppercase text-zinc-500">Status</p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              systemPaused ? "text-rose-400" : "text-emerald-400"
            )}
          >
            {systemPaused ? "Paused" : "Streaming"}
          </p>
        </MinesPanelCard>
      </div>

      {liveGames.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 py-14 text-center text-sm text-zinc-500">
          No active rounds — use Debug to spawn mock games.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {liveGames.map((g) => {
            const big = g.bet >= BIG;
            return (
              <MinesPanelCard
                key={g.id}
                title={g.username}
                subtitle={g.hitMine ? "Hit mine" : "In progress"}
                className={cn(
                  "transition-all duration-500",
                  big &&
                    "border-amber-500/45 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/20"
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <GridPreview
                    gridSize={g.gridSize}
                    cells={g.cells}
                    animateHidden={!g.hitMine}
                  />
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Bet</span>
                      <span
                        className={cn(
                          "font-mono",
                          big ? "text-amber-300" : "text-zinc-200"
                        )}
                      >
                        {formatMoney(g.bet)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Mines</span>
                      <span className="font-mono">{g.minesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Tiles revealed</span>
                      <span className="font-mono">{g.tilesRevealed}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-800 pt-2">
                      <span className="text-zinc-500">Potential payout</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {formatMoney(g.potentialPayout)}
                      </span>
                    </div>
                  </div>
                </div>
              </MinesPanelCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
