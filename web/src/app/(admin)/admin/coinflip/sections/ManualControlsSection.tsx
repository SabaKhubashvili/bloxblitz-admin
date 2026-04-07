"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { useCoinflipAdmin } from "../context/CoinflipAdminContext";
import { useState } from "react";
import { cn } from "../components/cn";

export function ManualControlsSection() {
  const {
    systemPaused,
    newGamesDisabled,
    setPaused,
    setNewGamesDisabled,
    clearActive,
  } = useCoinflipAdmin();
  const [confirm, setConfirm] = useState<
    "pause" | "resume" | "nogames" | "cancelall" | null
  >(null);

  const running = !systemPaused;

  return (
    <section id="controls" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Manual controls
          </h2>
          <p className="text-sm text-zinc-500">
            Operator overrides with confirmations.
          </p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
            running
              ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              running ? "animate-pulse bg-sky-400" : "bg-rose-400"
            )}
          />
          {running ? "Running" : "Paused"}
          {newGamesDisabled ? (
            <span className="ml-2 text-amber-400">· No new games</span>
          ) : null}
        </div>
      </div>

      <CoinflipPanelCard title="System">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={systemPaused}
            onClick={() => setConfirm("pause")}
            className="rounded-xl bg-amber-600/90 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-40"
          >
            Pause system
          </button>
          <button
            type="button"
            disabled={!systemPaused}
            onClick={() => setConfirm("resume")}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => setConfirm("nogames")}
            className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            {newGamesDisabled ? "Allow new games" : "Disable new games"}
          </button>
          <button
            type="button"
            onClick={() => setConfirm("cancelall")}
            className="rounded-xl bg-rose-600/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Cancel all active
          </button>
        </div>
      </CoinflipPanelCard>

      <ConfirmDialog
        isOpen={confirm === "pause"}
        onClose={() => setConfirm(null)}
        title="Pause coinflip?"
        description="Freezes matchmaking UI state (mock)."
        confirmLabel="Pause"
        variant="warning"
        onConfirm={() => setPaused(true)}
      />
      <ConfirmDialog
        isOpen={confirm === "resume"}
        onClose={() => setConfirm(null)}
        title="Resume coinflip?"
        description="Restores running state in mock admin."
        confirmLabel="Resume"
        variant="primary"
        onConfirm={() => setPaused(false)}
      />
      <ConfirmDialog
        isOpen={confirm === "nogames"}
        onClose={() => setConfirm(null)}
        title={
          newGamesDisabled ? "Allow new games?" : "Disable new games?"
        }
        description="Toggles mock flag only."
        confirmLabel="Confirm"
        variant="primary"
        onConfirm={() => setNewGamesDisabled(!newGamesDisabled)}
      />
      <ConfirmDialog
        isOpen={confirm === "cancelall"}
        onClose={() => setConfirm(null)}
        title="Cancel all active games?"
        description="Clears the active games list in local state."
        confirmLabel="Cancel all"
        variant="danger"
        onConfirm={clearActive}
      />
    </section>
  );
}
