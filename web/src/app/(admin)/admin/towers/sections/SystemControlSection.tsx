"use client";

import { PanelCard } from "../../dice/components/PanelCard";
import { useTowersSystemState } from "../hooks/useTowersSystemState";
import type { TowersSystemMode } from "@/lib/admin-api/towers-system";

export function SystemControlSection() {
  const { state, loading, setMode, isSaving } = useTowersSystemState();

  const onChange = async (mode: TowersSystemMode) => {
    await setMode(mode);
  };

  return (
    <section id="system" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">System control</h2>
        <p className="text-sm text-zinc-500">
          Operations mode in Redis (
          <code className="text-zinc-400">towers:system:state</code>
          ). The game API rejects new starts when new games are disabled or the mode is paused.
        </p>
      </div>

      <PanelCard title="Mode" subtitle="Applies immediately via Redis">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              disabled={isSaving}
              value={state?.mode ?? "ACTIVE"}
              onChange={(e) =>
                void onChange(e.target.value as TowersSystemMode)
              }
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="ACTIVE">ACTIVE — normal play</option>
              <option value="NEW_GAMES_DISABLED">
                NEW_GAMES_DISABLED — no new rounds
              </option>
              <option value="PAUSED">PAUSED — same as disabled for starts</option>
            </select>
            {isSaving ? (
              <span className="text-xs text-zinc-500">Saving…</span>
            ) : null}
          </div>
        )}
      </PanelCard>
    </section>
  );
}
