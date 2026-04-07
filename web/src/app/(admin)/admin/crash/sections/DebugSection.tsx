"use client";

import { CrashButton } from "../components/CrashButton";
import { CrashCard } from "../components/CrashCard";
import { CrashInputField } from "../components/CrashInputField";
import { useState } from "react";

export function DebugSection() {
  const [forceCrash, setForceCrash] = useState("2.47");
  const [replayId, setReplayId] = useState("CR-2849198");
  const [banner, setBanner] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <section id="debug" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-amber-200/90">
          Debug tools
        </h2>
        <p className="text-sm text-zinc-500">
          Shown only in development builds. No network requests.
        </p>
      </div>

      {banner ? (
        <div className="rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-300">
          {banner}
        </div>
      ) : null}

      <CrashCard
        title="Simulation"
        subtitle="Local-only hooks for QA"
        className="border-amber-900/40"
      >
        <div className="flex flex-wrap gap-3">
          <CrashButton
            variant="secondary"
            onClick={() => {
              const n = 3 + Math.floor(Math.random() * 8);
              setBanner(
                `[mock] Simulated ${n} rounds — check console for payload shape.`
              );
              // Future: replace with dev-only IPC or test harness
              console.info("[crash-admin dev] simulateRounds", { count: n });
            }}
          >
            Simulate rounds
          </CrashButton>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CrashInputField
            id="forceCrash"
            label="Force crash multiplier (UI only)"
            value={forceCrash}
            onChange={setForceCrash}
            hint="Would POST to ops endpoint"
          />
          <CrashInputField
            id="replay"
            label="Replay round id"
            value={replayId}
            onChange={setReplayId}
            hint="Would request replay bundle"
          />
        </div>
        <CrashButton
          variant="ghost"
          className="mt-4"
          onClick={() => {
            setBanner(
              `[mock] forceCrash=${forceCrash} replay=${replayId} — logged only.`
            );
            console.info("[crash-admin dev]", {
              forceCrash,
              replayId,
            });
          }}
        >
          Log debug payload
        </CrashButton>
      </CrashCard>
    </section>
  );
}
