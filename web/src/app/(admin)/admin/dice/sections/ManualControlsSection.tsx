"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { PanelCard } from "../components/PanelCard";
import { useDiceAdmin } from "../context/DiceAdminContext";
import {
  useDiceBettingStatus,
  useDisableBetting,
  useEnableBetting,
} from "../hooks/useDiceBetting";
import { useState } from "react";
import { cn } from "../components/cn";
import { isAxiosError } from "axios";

function mutationErrorMessage(e: unknown): string {
  if (isAxiosError(e) && e.response?.data && typeof e.response.data === "object") {
    const o = e.response.data as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.map(String).join(", ");
  }
  return e instanceof Error ? e.message : "Request failed";
}

export function ManualControlsSection() {
  const { systemPaused } = useDiceAdmin();
  const { data, isPending: statusLoading } = useDiceBettingStatus();
  const disableMutation = useDisableBetting();
  const enableMutation = useEnableBetting();
  const [confirmBetOff, setConfirmBetOff] = useState(false);
  const [confirmBetOn, setConfirmBetOn] = useState(false);

  const running = !systemPaused;
  const mutating = disableMutation.isPending || enableMutation.isPending;
  const bettingDisabled = data?.bettingDisabled ?? false;
  const controlsLocked = statusLoading || mutating;
  const mutError =
    disableMutation.error ?? enableMutation.error
      ? mutationErrorMessage(disableMutation.error ?? enableMutation.error)
      : null;

  return (
    <section id="controls" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Manual controls</h2>
        <p className="text-sm text-zinc-500">
          Operational kill switches — global dice betting uses shared Redis state with the game API.
        </p>
      </div>

      {mutError ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {mutError}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Engine status" subtitle="High-level state">
          <div className="flex flex-wrap items-center gap-4">
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-3",
                running
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-rose-500/40 bg-rose-500/10",
              )}
            >
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  running ? "animate-pulse bg-emerald-400" : "bg-rose-400",
                )}
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  running ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {running ? "Running" : "Paused"}
              </span>
            </div>
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                statusLoading
                  ? "border-zinc-700 bg-zinc-950/50 text-zinc-500"
                  : bettingDisabled
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-zinc-700 bg-zinc-950/50 text-zinc-400",
              )}
            >
              Betting:{" "}
              {statusLoading ? "loading…" : bettingDisabled ? "disabled" : "enabled"}
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Actions" subtitle="Require confirmation">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setConfirmBetOff(true)}
              disabled={controlsLocked || bettingDisabled}
              className="rounded-xl border border-amber-500/50 bg-amber-950/20 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-950/40 disabled:opacity-40"
            >
              Disable betting
            </button>
            <button
              type="button"
              onClick={() => setConfirmBetOn(true)}
              disabled={controlsLocked || !bettingDisabled}
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              Enable betting
            </button>
          </div>
        </PanelCard>
      </div>

      <ConfirmDialog
        isOpen={confirmBetOff}
        onClose={() => setConfirmBetOff(false)}
        title="Disable betting?"
        description="Players will be blocked from placing dice stakes until betting is re-enabled."
        variant="warning"
        onConfirm={() => disableMutation.mutate()}
      />
      <ConfirmDialog
        isOpen={confirmBetOn}
        onClose={() => setConfirmBetOn(false)}
        title="Enable betting?"
        description="Dice stakes will be accepted again on the main API."
        variant="primary"
        confirmLabel="Enable"
        onConfirm={() => enableMutation.mutate()}
      />
    </section>
  );
}
