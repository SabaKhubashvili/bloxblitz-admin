"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { MinesPanelCard } from "../components/MinesPanelCard";
import { useMinesAdmin } from "../context/MinesAdminContext";
import { useEffect, useState } from "react";
import { cn } from "../components/cn";

export function ManualControlsSection() {
  const {
    systemPaused,
    newGamesDisabled,
    minesControlsBusy,
    minesSystemHydrated,
    minesControlError,
    clearMinesControlError,
    pauseMines,
    resumeMines,
    toggleNewGames,
    resetActiveGames,
    refreshState,
  } = useMinesAdmin();

  const [c, setC] = useState<
    "pause" | "resume" | "nogame" | "reset" | null
  >(null);
  const [successFlash, setSuccessFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!successFlash) return;
    const t = window.setTimeout(() => setSuccessFlash(null), 6000);
    return () => window.clearTimeout(t);
  }, [successFlash]);

  const open = (next: typeof c) => {
    clearMinesControlError();
    setC(next);
  };

  const run = !systemPaused;
  const controlsLocked = minesControlsBusy || !minesSystemHydrated;

  return (
    <section id="controls" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Manual controls
          </h2>
          <p className="text-sm text-zinc-500">
            Live overrides — state is stored in Redis and enforced by the game
            API.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={controlsLocked}
            onClick={() => void refreshState()}
            className="rounded-full border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Refresh state
          </button>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
              !minesSystemHydrated
                ? "border-zinc-600 bg-zinc-800/60 text-zinc-400"
                : run
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                !minesSystemHydrated
                  ? "animate-pulse bg-zinc-500"
                  : run
                    ? "animate-pulse bg-emerald-400"
                    : "bg-rose-400",
              )}
            />
            {!minesSystemHydrated
              ? "Loading…"
              : run
                ? "Running"
                : "Paused"}
            {minesSystemHydrated && newGamesDisabled ? (
              <span className="ml-2 text-amber-400">· No new games</span>
            ) : null}
          </div>
        </div>
      </div>

      {successFlash ? (
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successFlash}
        </div>
      ) : null}

      {minesControlError && !c ? (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {minesControlError}
        </div>
      ) : null}

      <MinesPanelCard title="Operator">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={controlsLocked || systemPaused}
            onClick={() => open("pause")}
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
          >
            Pause mines
          </button>
          <button
            type="button"
            disabled={controlsLocked || !systemPaused}
            onClick={() => open("resume")}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Resume
          </button>
          <button
            type="button"
            disabled={controlsLocked || systemPaused}
            onClick={() => open("nogame")}
            className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 disabled:opacity-40"
          >
            {newGamesDisabled ? "Allow new games" : "Disable new games"}
          </button>
          <button
            type="button"
            disabled={controlsLocked}
            onClick={() => open("reset")}
            className="rounded-xl bg-rose-600/90 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Reset active games
          </button>
        </div>
      </MinesPanelCard>

      <ConfirmDialog
        isOpen={c === "pause"}
        onClose={() => setC(null)}
        title="Pause mines?"
        description="Stops all Mines play: no new games and no reveals or cashouts on active rounds until you resume."
        variant="warning"
        busy={minesControlsBusy}
        errorText={minesControlError}
        onConfirm={async () => {
          await pauseMines();
          setSuccessFlash("Mines paused.");
        }}
      />
      <ConfirmDialog
        isOpen={c === "resume"}
        onClose={() => setC(null)}
        title="Resume mines?"
        variant="primary"
        busy={minesControlsBusy}
        errorText={minesControlError}
        description="Returns Mines to normal operation (new games and gameplay), unless you had disabled new games only — use toggle again after resume if needed."
        onConfirm={async () => {
          await resumeMines();
          setSuccessFlash("Mines resumed.");
        }}
      />
      <ConfirmDialog
        isOpen={c === "nogame"}
        onClose={() => setC(null)}
        title={newGamesDisabled ? "Allow new games?" : "Disable new games?"}
        variant="primary"
        busy={minesControlsBusy}
        errorText={minesControlError}
        description={
          newGamesDisabled
            ? "Players will be able to start new Mines rounds again. Active rounds keep playing."
            : "Players cannot start new rounds; existing active games continue until they finish or cash out."
        }
        onConfirm={async () => {
          const wasDisabled = newGamesDisabled;
          await toggleNewGames();
          setSuccessFlash(
            wasDisabled
              ? "New Mines games are allowed again."
              : "New Mines games are disabled.",
          );
        }}
      />
      <ConfirmDialog
        isOpen={c === "reset"}
        onClose={() => setC(null)}
        title="Reset all active games?"
        variant="danger"
        busy={minesControlsBusy}
        errorText={minesControlError}
        description="Forces every in-progress Mines round closed, refunds each player (stake or fair cashout value), updates history, and briefly pauses the system during processing."
        onConfirm={async () => {
          const summary = await resetActiveGames();
          const failed = summary.games.filter(
            (g) =>
              g.skippedReason === "REFUND_ERROR" ||
              g.skippedReason === "MISSING_REDIS_GAME_BLOB",
          ).length;
          setSuccessFlash(
            failed > 0
              ? `Games reset: ${summary.gamesProcessed} processed, ${summary.gamesCredited} credited. ${failed} need follow-up (see API logs).`
              : `Games reset: ${summary.gamesProcessed} processed, ${summary.gamesCredited} refunded.`,
          );
        }}
      />
    </section>
  );
}
