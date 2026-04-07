"use client";

import { InputField } from "../components/InputField";
import { PanelCard } from "../components/PanelCard";
import type { DiceGameConfig } from "../mock/types";
import {
  buildDiceConfigPatch,
  DEFAULT_DICE_CONFIG_API,
  diceConfigApiToForm,
} from "@/lib/admin-api/dice-config-api";
import { useDiceConfig } from "../hooks/useDiceConfig";
import { useEffect, useMemo, useState } from "react";

export function ConfigurationSection() {
  const {
    config,
    isLoadingConfig,
    isSaving,
    savePartialConfig,
    saveError,
    resetSaveError,
  } = useDiceConfig();

  const [draft, setDraft] = useState<DiceGameConfig | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (config && draft === null) {
      setDraft(diceConfigApiToForm(config));
    }
  }, [config, draft]);

  const savedApi = config ?? DEFAULT_DICE_CONFIG_API;

  const dirty = useMemo(() => {
    if (!draft) return false;
    return Object.keys(buildDiceConfigPatch(savedApi, draft)).length > 0;
  }, [draft, savedApi]);

  const errors = useMemo(() => {
    if (!draft) return [];
    const e: string[] = [];
    if (draft.minBet >= draft.maxBet)
      e.push("Min bet must be less than max bet.");
    if (draft.minRoll >= draft.maxRoll)
      e.push("Min roll must be less than max roll.");
    if (draft.minRoll < 0 || draft.maxRoll > 100)
      e.push("Roll bounds must stay within 0–100.");
    if (draft.houseEdgePercent < 0 || draft.houseEdgePercent > 25)
      e.push("House edge typically 0–25%.");
    if (draft.rtpTarget < 80 || draft.rtpTarget > 99.9)
      e.push("RTP target between 80% and 99.9%.");
    if (draft.maxPayoutMultiplier < 1 || draft.maxPayoutMultiplier > 99_999)
      e.push("Max payout multiplier out of range.");
    return e;
  }, [draft]);

  const inputsBusy = !draft || isSaving || isLoadingConfig;

  const save = async () => {
    if (!draft || errors.length || isSaving) return;
    const patch = buildDiceConfigPatch(savedApi, draft);
    if (Object.keys(patch).length === 0) return;
    resetSaveError();
    try {
      const updated = await savePartialConfig(patch);
      setDraft(diceConfigApiToForm(updated));
      setToast(true);
      window.setTimeout(() => setToast(false), 2400);
    } catch {
      /* mutation error surfaced via saveError after state update */
    }
  };

  const patch = (p: Partial<DiceGameConfig>) => {
    resetSaveError();
    setDraft((d) => (d ? { ...d, ...p } : d));
  };

  return (
    <section id="config" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Game configuration</h2>
          <p className="text-sm text-zinc-500">
            Stake limits, edge &amp; RTP — stored in Redis via admin API.
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
            disabled={
              !dirty || errors.length > 0 || inputsBusy
            }
            onClick={() => void save()}
            className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Configuration saved to Redis.
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {saveError instanceof Error
            ? saveError.message
            : "Save failed"}
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
        <PanelCard title="Stakes" subtitle="Per-roll limits" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="d-min-bet"
              label="Min bet"
              type="number"
              step="0.01"
              value={draft?.minBet ?? 0}
              onChange={(v) => patch({ minBet: Number(v) || 0 })}
              disabled={inputsBusy}
              error={
                draft && draft.minBet >= draft.maxBet
                  ? "Must be lower than max bet"
                  : undefined
              }
            />
            <InputField
              id="d-max-bet"
              label="Max bet"
              type="number"
              step="0.01"
              value={draft?.maxBet ?? 0}
              onChange={(v) => patch({ maxBet: Number(v) || 0 })}
              disabled={inputsBusy}
            />
          </div>
        </PanelCard>

        <PanelCard title="Economy" subtitle="Edge & caps" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <InputField
              id="d-house"
              label="House edge"
              type="number"
              step="0.1"
              value={draft?.houseEdgePercent ?? 0}
              onChange={(v) => patch({ houseEdgePercent: Number(v) || 0 })}
              disabled={inputsBusy}
              suffix="%"
            />
            <InputField
              id="d-rtp"
              label="RTP target"
              type="number"
              step="0.1"
              value={draft?.rtpTarget ?? 0}
              onChange={(v) => patch({ rtpTarget: Number(v) || 0 })}
              disabled={inputsBusy}
              suffix="%"
            />
            <InputField
              id="d-max-mult"
              label="Max payout multiplier"
              type="number"
              step="1"
              value={draft?.maxPayoutMultiplier ?? 0}
              onChange={(v) =>
                patch({ maxPayoutMultiplier: Number(v) || 0 })
              }
              disabled={inputsBusy}
              suffix="×"
            />
          </div>
        </PanelCard>
      </div>
    </section>
  );
}
