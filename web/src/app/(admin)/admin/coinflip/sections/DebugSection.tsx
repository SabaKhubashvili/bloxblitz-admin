"use client";

import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { useCoinflipAdmin } from "../context/CoinflipAdminContext";
import type { ActiveCoinflipGame, CoinSide } from "../mock/types";

export function DebugSection() {
  const { activeGames, addActive, resolveActive } = useCoinflipAdmin();

  if (process.env.NODE_ENV !== "development") return null;

  const addMock = () => {
    const sides: CoinSide[] = ["heads", "tails"];
    const p1s = sides[Math.floor(Math.random() * 2)];
    const p2s = sides.find((s) => s !== p1s) ?? "tails";
    const withOpponent = Math.random() > 0.35;
    const w = Math.round(5 + Math.random() * 400);
    const g: ActiveCoinflipGame = {
      id: `cf-dev-${Date.now()}`,
      player1: {
        username: `devP1_${Math.floor(Math.random() * 99)}`,
        wager: w,
        side: p1s,
      },
      player2: withOpponent
        ? {
            username: `devP2_${Math.floor(Math.random() * 99)}`,
            wager: w,
            side: p2s,
          }
        : null,
      status: withOpponent ? "active" : "waiting",
      createdAt: new Date().toISOString(),
    };
    addActive(g);
  };

  const forceWinner = () => {
    const ready = activeGames.find((g) => g.status === "active" && g.player2);
    if (ready) resolveActive(ready.id);
  };

  return (
    <section id="debug" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-amber-200/90">Debug</h2>
        <p className="text-sm text-zinc-500">Development build only.</p>
      </div>

      <CoinflipPanelCard title="Mock generators" className="border-amber-900/30">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addMock}
            className="rounded-xl border border-violet-600/50 bg-violet-600/15 px-4 py-2 text-sm font-medium text-violet-200"
          >
            Create mock game
          </button>
          <button
            type="button"
            onClick={() => {
              for (let i = 0; i < 3; i++) addMock();
            }}
            className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-300"
          >
            Burst ×3
          </button>
          <button
            type="button"
            onClick={forceWinner}
            className="rounded-xl border border-sky-600/50 bg-sky-600/15 px-4 py-2 text-sm font-medium text-sky-200"
          >
            Force resolve random active
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Force resolve picks first active game with two players and appends
          history (mock).
        </p>
      </CoinflipPanelCard>
    </section>
  );
}
