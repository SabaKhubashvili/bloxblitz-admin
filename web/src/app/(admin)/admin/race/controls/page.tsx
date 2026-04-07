"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { RaceAdminShell } from "../components/RaceAdminShell";
import { useRaceAdmin } from "../context/RaceAdminContext";
import {
  postRaceCancel,
  postRaceEnd,
  postRacePause,
  postRacePauseTracking,
  postRaceResume,
  postRaceResumeTracking,
  racesAxiosErrorMessage,
} from "@/lib/admin-api/races";
import { useState } from "react";
import { cn } from "../components/cn";

export default function RaceControlsPage() {
  const {
    activeRace,
    scheduledRace,
    trackingPaused,
    refreshAll,
  } = useRaceAdmin();
  const [endOpen, setEndOpen] = useState(false);
  const [cancelActiveOpen, setCancelActiveOpen] = useState(false);
  const [cancelSchedOpen, setCancelSchedOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [pauseRaceOpen, setPauseRaceOpen] = useState(false);
  const [resumeRaceOpen, setResumeRaceOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
      await refreshAll();
    } catch (e) {
      setActionError(racesAxiosErrorMessage(e));
      throw e;
    }
  };

  const enginePaused = activeRace?.status === "paused";
  const canPauseTracking =
    !!activeRace && activeRace.status === "active" && !trackingPaused;
  const canResumeTracking =
    !!activeRace && activeRace.status === "active" && trackingPaused;
  const canPauseRace = !!activeRace && activeRace.status === "active";
  const canResumeRace = !!activeRace && activeRace.status === "paused";

  return (
    <RaceAdminShell title="Race controls">
      <header className="mb-8 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Race controls
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Actions call the admin API (end, cancel, pause race, pause/resume
          wager tracking).
        </p>
      </header>

      {actionError ? (
        <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className={cn(
            "rounded-2xl border p-6 shadow-lg",
            activeRace
              ? "border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-zinc-950"
              : "border-zinc-800 bg-zinc-900/40",
          )}
        >
          <h2 className="text-sm font-semibold text-zinc-200">Engine</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  activeRace ? "animate-pulse bg-emerald-400" : "bg-zinc-600",
                )}
              />
              <span className="text-sm font-medium text-zinc-300">
                {activeRace
                  ? enginePaused
                    ? "Race paused"
                    : "Race live"
                  : "No active race"}
              </span>
            </div>
            <div
              className={cn(
                "rounded-lg border px-3 py-1 text-xs font-medium",
                trackingPaused
                  ? "border-amber-500/40 text-amber-300"
                  : "border-zinc-700 text-zinc-500",
              )}
            >
              Wager tracking:{" "}
              {trackingPaused ? "paused" : "running"}
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            Scheduled races flip to <span className="text-zinc-400">active</span>{" "}
            automatically at start time (server cron). There is no separate
            &quot;start&quot; button.
          </p>
          {scheduledRace ? (
            <p className="mt-3 text-xs text-zinc-500">
              Queued next:{" "}
              <span className="font-mono text-zinc-400">
                {scheduledRace.name}
              </span>
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6 shadow-lg">
          <h2 className="text-sm font-semibold text-zinc-200">Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!activeRace}
              onClick={() => setEndOpen(true)}
              className="rounded-xl border border-rose-500/50 bg-rose-950/30 px-4 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-950/50 disabled:opacity-40"
            >
              End race early
            </button>
            <button
              type="button"
              disabled={!activeRace}
              onClick={() => setCancelActiveOpen(true)}
              className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Cancel active
            </button>
            <button
              type="button"
              disabled={!scheduledRace}
              onClick={() => setCancelSchedOpen(true)}
              className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Cancel scheduled
            </button>
            <button
              type="button"
              disabled={!canPauseRace}
              onClick={() => setPauseRaceOpen(true)}
              className="rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
            >
              Pause race
            </button>
            <button
              type="button"
              disabled={!canResumeRace}
              onClick={() => setResumeRaceOpen(true)}
              className="rounded-xl border border-sky-500/40 px-4 py-2.5 text-sm text-sky-200 hover:bg-sky-500/10 disabled:opacity-40"
            >
              Resume race
            </button>
            <button
              type="button"
              disabled={!canPauseTracking}
              onClick={() => setPauseOpen(true)}
              className="rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-500/10 disabled:opacity-40"
            >
              Pause tracking
            </button>
            <button
              type="button"
              disabled={!canResumeTracking}
              onClick={() => setResumeOpen(true)}
              className="rounded-xl border border-sky-500/40 px-4 py-2.5 text-sm text-sky-200 hover:bg-sky-500/10 disabled:opacity-40"
            >
              Resume tracking
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={endOpen}
        onClose={() => setEndOpen(false)}
        title="End race early?"
        description="Finalizes the race, writes ranks, and clears live caches."
        onConfirm={() =>
          activeRace
            ? run(() => postRaceEnd(activeRace.id))
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        isOpen={cancelActiveOpen}
        onClose={() => setCancelActiveOpen(false)}
        title="Cancel active race?"
        description="Marks the race as cancelled and clears leaderboard keys."
        onConfirm={() =>
          activeRace
            ? run(() => postRaceCancel(activeRace.id))
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        isOpen={cancelSchedOpen}
        onClose={() => setCancelSchedOpen(false)}
        title="Cancel scheduled race?"
        description="Cancels the queued race before it goes live."
        onConfirm={() =>
          scheduledRace
            ? run(() => postRaceCancel(scheduledRace.id))
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        isOpen={pauseRaceOpen}
        onClose={() => setPauseRaceOpen(false)}
        title="Pause race?"
        description="Freezes the race (status PAUSED). Wager credits stop until you resume."
        variant="warning"
        onConfirm={() =>
          activeRace
            ? run(() => postRacePause(activeRace.id))
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        isOpen={resumeRaceOpen}
        onClose={() => setResumeRaceOpen(false)}
        title="Resume race?"
        description="Returns the race to ACTIVE (if it was paused)."
        variant="primary"
        confirmLabel="Resume"
        onConfirm={() =>
          activeRace
            ? run(() => postRaceResume(activeRace.id))
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        isOpen={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title="Pause wager tracking?"
        description="Time still runs; leaderboard credits are frozen until you resume tracking."
        variant="warning"
        onConfirm={() =>
          activeRace
            ? run(() => postRacePauseTracking(activeRace.id))
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        isOpen={resumeOpen}
        onClose={() => setResumeOpen(false)}
        title="Resume wager tracking?"
        description="Turns wager credits back on for this active race."
        variant="primary"
        confirmLabel="Resume"
        onConfirm={() =>
          activeRace
            ? run(() => postRaceResumeTracking(activeRace.id))
            : Promise.resolve()
        }
      />
    </RaceAdminShell>
  );
}
