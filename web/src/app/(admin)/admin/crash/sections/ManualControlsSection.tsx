"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { CrashButton } from "../components/CrashButton";
import { CrashCard } from "../components/CrashCard";
import { useCrashRuntimeControls } from "../hooks/useCrashRuntimeControls";
import { useState } from "react";
import { cn } from "../components/cn";

type ConfirmKind = "pause" | "resume" | "betting" | null;

export function ManualControlsSection() {
  const {
    paused,
    betsDisabled,
    ready,
    loading,
    error,
    refresh,
    pauseGame,
    resumeGame,
    disableBets,
    enableBets,
  } = useCrashRuntimeControls();

  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  const running = !paused;

  return (
    <section id="controls" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Manual controls
          </h2>
          <p className="text-sm text-zinc-500">
            Redis flags <span className="font-mono text-zinc-400">bb:crash:runtime:*</span>{" "}
            — consumed by the Crash game service.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading && !ready ? (
            <div className="inline-flex rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-400">
              Loading runtime…
            </div>
          ) : (
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                running
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  running ? "animate-pulse bg-emerald-400" : "bg-rose-400",
                )}
              />
              {running ? "Running" : "Paused"}
            </div>
          )}
          {betsDisabled ? (
            <div className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200">
              Bets disabled
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="min-w-0 wrap-break-word">{error}</p>
          <CrashButton variant="secondary" className="shrink-0" onClick={() => void refresh()}>
            Retry
          </CrashButton>
        </div>
      ) : null}

      <CrashCard title="Round engine" subtitle="Operator overrides">
        <div className="flex flex-wrap gap-3">
          <CrashButton
            variant="warning"
            disabled={!ready || !running}
            onClick={() => setConfirm("pause")}
          >
            Pause game
          </CrashButton>
          <CrashButton
            variant="primary"
            disabled={!ready || running}
            onClick={() => setConfirm("resume")}
          >
            Resume game
          </CrashButton>
          <CrashButton
            variant={betsDisabled ? "primary" : "secondary"}
            disabled={!ready}
            onClick={() => setConfirm("betting")}
          >
            {betsDisabled ? "Enable betting" : "Disable betting"}
          </CrashButton>
        </div>
      </CrashCard>

      <ConfirmDialog
        isOpen={confirm === "pause"}
        onClose={() => setConfirm(null)}
        title="Pause the game?"
        description="Sets Redis key bb:crash:runtime:paused. The Crash service should stop advancing rounds until you resume."
        confirmLabel="Pause"
        variant="warning"
        onConfirm={() => pauseGame()}
      />
      <ConfirmDialog
        isOpen={confirm === "resume"}
        onClose={() => setConfirm(null)}
        title="Resume the game?"
        description="Clears the pause flag so the round loop can continue."
        confirmLabel="Resume"
        variant="primary"
        onConfirm={() => resumeGame()}
      />
      <ConfirmDialog
        isOpen={confirm === "betting"}
        onClose={() => setConfirm(null)}
        title={betsDisabled ? "Enable betting?" : "Disable betting?"}
        description={
          betsDisabled
            ? "Clears bb:crash:runtime:bets_disabled so new stakes can be accepted."
            : "Sets bb:crash:runtime:bets_disabled — the game service should reject new bets."
        }
        confirmLabel={betsDisabled ? "Enable" : "Disable"}
        variant={betsDisabled ? "primary" : "warning"}
        onConfirm={() =>
          betsDisabled ? enableBets() : disableBets()
        }
      />
    </section>
  );
}
