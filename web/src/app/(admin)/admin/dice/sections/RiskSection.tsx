"use client";

import { InputField } from "../components/InputField";
import { PanelCard } from "../components/PanelCard";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { useDiceAdmin } from "../context/DiceAdminContext";
import type { DiceRiskLimits } from "../mock/types";
import { useMemo, useState } from "react";

function serialize(r: DiceRiskLimits) {
  return JSON.stringify(r);
}

export function RiskSection() {
  const { risk, setRisk } = useDiceAdmin();
  const [draft, setDraft] = useState<DiceRiskLimits>(() => ({ ...risk }));
  const [savedSnap, setSavedSnap] = useState(() => serialize(risk));
  const [toast, setToast] = useState(false);

  const dirty = serialize(draft) !== savedSnap;

  const errors = useMemo(() => {
    const e: string[] = [];
    if (draft.maxWagerPerUser <= 0) e.push("Max wager per user must be positive.");
    if (draft.maxProfitPerUser <= 0)
      e.push("Max profit per user must be positive.");
    if (draft.maxLossPerUser <= 0)
      e.push("Max loss per user must be positive.");
    if (draft.maxPayoutPerRoll <= 0)
      e.push("Max payout per roll must be positive.");
    if (draft.maxLossPerUser > draft.maxProfitPerUser * 3)
      e.push("Check loss vs profit caps — unusual ratio.");
    return e;
  }, [draft]);

  const save = () => {
    if (errors.length) return;
    setRisk(draft);
    setSavedSnap(serialize(draft));
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
  };

  const patch = (p: Partial<DiceRiskLimits>) =>
    setDraft((d) => ({ ...d, ...p }));

  return (
    <section id="risk" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Risk & limits</h2>
          <p className="text-sm text-zinc-500">
            Per-user exposure and automated guardrails (mock).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? (
            <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              Unsaved changes
            </span>
          ) : null}
          <button
            type="button"
            disabled={!dirty || errors.length > 0}
            onClick={save}
            className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Risk profile saved locally.
        </div>
      ) : null}

      {errors.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-rose-400">
          {errors.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Exposure caps" subtitle="Hard limits per user / roll">
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="r-max-wager"
              label="Max wager per user"
              type="number"
              step="1"
              value={draft.maxWagerPerUser}
              onChange={(v) => patch({ maxWagerPerUser: Number(v) || 0 })}
            />
            <InputField
              id="r-max-profit"
              label="Max profit per user"
              type="number"
              step="1"
              value={draft.maxProfitPerUser}
              onChange={(v) => patch({ maxProfitPerUser: Number(v) || 0 })}
            />
            <InputField
              id="r-max-loss"
              label="Max loss per user"
              type="number"
              step="1"
              value={draft.maxLossPerUser}
              onChange={(v) => patch({ maxLossPerUser: Number(v) || 0 })}
            />
            <InputField
              id="r-max-payout-roll"
              label="Max payout per roll"
              type="number"
              step="1"
              value={draft.maxPayoutPerRoll}
              onChange={(v) => patch({ maxPayoutPerRoll: Number(v) || 0 })}
            />
          </div>
        </PanelCard>

        <PanelCard title="Automation" subtitle="Operational toggles">
          <div className="space-y-3">
            <ToggleSwitch
              id="r-auto-stop"
              label="Auto-stop on large losses"
              description="Pause new dice rounds if drawdown exceeds mock threshold."
              checked={draft.autoStopLargeLosses}
              onChange={(v) => patch({ autoStopLargeLosses: v })}
            />
            <ToggleSwitch
              id="r-cooldown"
              label="Cooldown after big wins"
              description="Brief stake throttle after outsized player wins."
              checked={draft.cooldownAfterBigWins}
              onChange={(v) => patch({ cooldownAfterBigWins: v })}
            />
          </div>
        </PanelCard>
      </div>
    </section>
  );
}
