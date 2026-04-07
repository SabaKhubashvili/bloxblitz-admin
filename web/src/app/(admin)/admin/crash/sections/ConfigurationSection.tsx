"use client";

import { CrashButton } from "../components/CrashButton";
import { CrashCard } from "../components/CrashCard";
import { CrashInputField } from "../components/CrashInputField";
import { DEFAULT_CONFIG } from "../mock/data";
import type { CrashGameConfig, Volatility } from "../mock/types";
import { useCallback, useMemo, useState } from "react";
import { cn } from "../components/cn";

function serialize(c: CrashGameConfig) {
  return JSON.stringify(c);
}

export function ConfigurationSection() {
  const [saved, setSaved] = useState<CrashGameConfig>(DEFAULT_CONFIG);
  const [draft, setDraft] = useState<CrashGameConfig>(DEFAULT_CONFIG);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const dirty = useMemo(
    () => serialize(draft) !== serialize(saved),
    [draft, saved]
  );

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (draft.minBet >= draft.maxBet)
      e.betRange = "Min bet must be less than max bet.";
    if (draft.minCashout >= draft.maxMultiplierCap)
      e.cashout = "Min cashout must be below max multiplier cap.";
    if (draft.houseEdgePercent < 0 || draft.houseEdgePercent > 50)
      e.houseEdge = "House edge should be between 0% and 50%.";
    if (draft.rtpTarget < 80 || draft.rtpTarget > 99.9)
      e.rtp = "RTP target typically stays between 80% and 99.9%.";
    if (draft.tickRate < 1 || draft.tickRate > 120)
      e.tick = "Tick rate between 1 and 120.";
    return e;
  }, [draft]);

  const valid = Object.keys(errors).length === 0;

  const update = useCallback(<K extends keyof CrashGameConfig>(k: K, v: CrashGameConfig[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, []);

  const handleSave = () => {
    if (!valid) return;
    setSaved({ ...draft });
    setSavedAt(new Date().toLocaleTimeString());
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2600);
    // Future: await fetch('/api/admin/crash/config', { method: 'PUT', body: JSON.stringify(draft) })
  };

  return (
    <section id="configuration" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Game configuration
          </h2>
          <p className="text-sm text-zinc-500">
            Editable draft — connect to your config API when ready.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dirty ? (
            <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              Unsaved changes
            </span>
          ) : (
            <span className="text-xs text-zinc-500">
              {savedAt ? `Saved ${savedAt}` : "Synced with defaults"}
            </span>
          )}
          <CrashButton
            variant="primary"
            disabled={!dirty || !valid}
            onClick={handleSave}
          >
            Save configuration
          </CrashButton>
        </div>
      </div>

      {showToast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Configuration saved (mock). No backend call was made.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CrashCard title="Betting limits" subtitle="Stake boundaries">
          <div className="grid gap-4 sm:grid-cols-2">
            <CrashInputField
              id="minBet"
              label="Min bet"
              type="number"
              value={draft.minBet}
              onChange={(v) => update("minBet", Number(v) || 0)}
              error={errors.betRange}
              step="0.01"
              min="0"
            />
            <CrashInputField
              id="maxBet"
              label="Max bet"
              type="number"
              value={draft.maxBet}
              onChange={(v) => update("maxBet", Number(v) || 0)}
              step="1"
              min="0"
            />
          </div>
          {errors.betRange ? (
            <p className="mt-3 text-xs text-rose-400">{errors.betRange}</p>
          ) : null}
        </CrashCard>

        <CrashCard title="Multipliers" subtitle="Cashout behaviour">
          <div className="grid gap-4 sm:grid-cols-2">
            <CrashInputField
              id="minCashout"
              label="Min cashout"
              type="number"
              value={draft.minCashout}
              onChange={(v) => update("minCashout", Number(v) || 0)}
              error={errors.cashout}
              step="0.01"
            />
            <CrashInputField
              id="maxCap"
              label="Max multiplier cap"
              type="number"
              value={draft.maxMultiplierCap}
              onChange={(v) => update("maxMultiplierCap", Number(v) || 0)}
              step="1"
            />
          </div>
        </CrashCard>

        <CrashCard title="Economy" subtitle="Edge and targets">
          <div className="grid gap-4 sm:grid-cols-2">
            <CrashInputField
              id="houseEdge"
              label="House edge"
              type="number"
              value={draft.houseEdgePercent}
              onChange={(v) => update("houseEdgePercent", Number(v) || 0)}
              error={errors.houseEdge}
              suffix="%"
              step="0.1"
            />
            <CrashInputField
              id="rtp"
              label="RTP target"
              type="number"
              value={draft.rtpTarget}
              onChange={(v) => update("rtpTarget", Number(v) || 0)}
              error={errors.rtp}
              suffix="%"
              step="0.1"
            />
          </div>
        </CrashCard>

        <CrashCard title="Timing & feel" subtitle="Simulation pacing">
          <div className="grid gap-4 sm:grid-cols-2">
            <CrashInputField
              id="gameSpeed"
              label="Game speed"
              type="number"
              value={draft.gameSpeed}
              onChange={(v) => update("gameSpeed", Number(v) || 0)}
              hint="Scalar vs baseline (mock)"
              step="0.05"
            />
            <CrashInputField
              id="tickRate"
              label="Tick rate"
              type="number"
              value={draft.tickRate}
              onChange={(v) => update("tickRate", Number(v) || 0)}
              error={errors.tick}
              hint="Updates per second (UI only)"
            />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Volatility
            </label>
            <select
              value={draft.volatility}
              onChange={(e) =>
                update("volatility", e.target.value as Volatility)
              }
              className={cn(
                "h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 text-sm text-zinc-100",
                "focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              )}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </CrashCard>
      </div>
    </section>
  );
}
