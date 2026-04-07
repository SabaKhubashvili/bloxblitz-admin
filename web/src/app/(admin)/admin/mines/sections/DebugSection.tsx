"use client";

import { MinesPanelCard } from "../components/MinesPanelCard";
import { MinesInputField } from "../components/MinesInputField";
import { useMinesAdmin } from "../context/MinesAdminContext";
import { randomLiveGame } from "../mock/data";
import { useRef, useState } from "react";

export function DebugSection() {
  const { addLiveGame, addHistory, config } = useMinesAdmin();
  const [layoutMines, setLayoutMines] = useState(String(config.defaultMinesCount));
  const [banner, setBanner] = useState<string | null>(null);
  const autoRef = useRef<number | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

  const spawn = (seed: number) => addLiveGame(randomLiveGame(seed));

  return (
    <section id="debug" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-amber-200/90">Debug</h2>
        <p className="text-sm text-zinc-500">Dev-only mock tools.</p>
      </div>

      {banner ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-300">
          {banner}
        </div>
      ) : null}

      <MinesPanelCard title="Simulate" className="border-amber-900/30">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => spawn(Date.now() % 100000)}
            className="rounded-xl bg-violet-600/90 px-4 py-2 text-sm font-medium text-white"
          >
            Simulate mines game
          </button>
          <button
            type="button"
            onClick={() => {
              for (let i = 0; i < 4; i++) spawn(Date.now() + i);
            }}
            className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-300"
          >
            Burst ×4
          </button>
        </div>

        <div className="mt-6 max-w-xs">
          <MinesInputField
            id="force-mines"
            label="Force mine count (UI payload)"
            type="number"
            value={layoutMines}
            onChange={setLayoutMines}
            min="1"
            hint="Logged only — does not mutate RNG server-side."
          />
        </div>
        <button
          type="button"
          className="mt-3 text-sm text-sky-400 hover:underline"
          onClick={() => {
            setBanner(
              `[mock] forceMineCount=${layoutMines} grid=${config.gridSize}`
            );
            console.info("[mines-admin dev] forceLayout", {
              mines: Number(layoutMines),
              grid: config.gridSize,
            });
          }}
        >
          Log forced layout payload
        </button>

        <div className="mt-8 border-t border-zinc-800 pt-6">
          <p className="text-sm font-medium text-zinc-300">Auto-play</p>
          <p className="text-xs text-zinc-500">
            Spawns a mock completed round into history every 2s while running.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="rounded-xl bg-emerald-700/80 px-4 py-2 text-sm text-white"
              onClick={() => {
                if (autoRef.current) return;
                autoRef.current = window.setInterval(() => {
                  const g = randomLiveGame(Date.now() % 99999);
                  addHistory({
                    id: `mn-auto-${Date.now()}`,
                    username: g.username,
                    betAmount: g.bet,
                    minesCount: g.minesCount,
                    tilesCleared: g.cells.filter((c) => c === true).length,
                    cashoutMultiplier: g.hitMine
                      ? 0
                      : Math.round((g.potentialPayout / g.bet) * 100) / 100,
                    profitLoss: g.hitMine
                      ? -g.bet
                      : Math.round(g.potentialPayout - g.bet),
                    timestamp: new Date().toISOString(),
                    gridSize: g.gridSize,
                    mineIndices: [...g.mineIndices],
                    revealedIndices: g.cells
                      .map((c, i) => (c === true ? i : -1))
                      .filter((i) => i >= 0),
                  });
                }, 2000);
              }}
            >
              Start auto-play
            </button>
            <button
              type="button"
              className="rounded-xl border border-rose-600/50 px-4 py-2 text-sm text-rose-300"
              onClick={() => {
                if (autoRef.current) {
                  window.clearInterval(autoRef.current);
                  autoRef.current = null;
                }
              }}
            >
              Stop
            </button>
          </div>
        </div>
      </MinesPanelCard>
    </section>
  );
}
