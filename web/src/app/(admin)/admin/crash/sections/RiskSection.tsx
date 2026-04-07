"use client";

import { CrashCard } from "../components/CrashCard";
import { CrashInputField } from "../components/CrashInputField";
import { CrashToggleSwitch } from "../components/CrashToggleSwitch";
import { DEFAULT_RISK } from "../mock/data";
import type { RiskLimits } from "../mock/types";
import { useState } from "react";
import { CrashButton } from "../components/CrashButton";

export function RiskSection() {
  const [risk, setRisk] = useState<RiskLimits>(DEFAULT_RISK);

  const update = <K extends keyof RiskLimits>(k: K, v: RiskLimits[K]) => {
    setRisk((r) => ({ ...r, [k]: v }));
  };

  return (
    <section id="risk" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Risk management
        </h2>
        <p className="text-sm text-zinc-500">
          Per-round and per-user caps — mock persistence only.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CrashCard title="Exposure caps" subtitle="Hard limits">
          <div className="grid gap-4">
            <CrashInputField
              id="maxPayoutRound"
              label="Max total payout / round"
              type="number"
              value={risk.maxTotalPayoutPerRound}
              onChange={(v) =>
                update("maxTotalPayoutPerRound", Number(v) || 0)
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CrashInputField
                id="maxProfitUser"
                label="Max profit / user"
                type="number"
                value={risk.maxProfitPerUser}
                onChange={(v) => update("maxProfitPerUser", Number(v) || 0)}
              />
              <CrashInputField
                id="maxLossUser"
                label="Max loss / user"
                type="number"
                value={risk.maxLossPerUser}
                onChange={(v) => update("maxLossPerUser", Number(v) || 0)}
              />
            </div>
            <CrashInputField
              id="maxConcurrent"
              label="Max concurrent bets"
              type="number"
              value={risk.maxConcurrentBets}
              onChange={(v) => update("maxConcurrentBets", Number(v) || 0)}
            />
          </div>
        </CrashCard>

        <CrashCard title="Automation" subtitle="Safety toggles">
          <div className="space-y-3">
            <CrashToggleSwitch
              label="Auto-stop when exposure cap is hit"
              checked={risk.autoStopEnabled}
              onChange={(v) => update("autoStopEnabled", v)}
            />
            <CrashToggleSwitch
              label="Cooldown between rounds"
              checked={risk.cooldownEnabled}
              onChange={(v) => update("cooldownEnabled", v)}
            />
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            When wired to a backend, these should enforce server-side checks —
            never trust the admin UI alone.
          </p>
          <div className="mt-4">
            <CrashButton
              variant="secondary"
              onClick={() => {
                setRisk(DEFAULT_RISK);
              }}
            >
              Reset to defaults
            </CrashButton>
          </div>
        </CrashCard>
      </div>
    </section>
  );
}
