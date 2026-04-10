"use client";

import { InputField } from "../../dice/components/InputField";
import { PanelCard } from "../../dice/components/PanelCard";
import { useTowersConfig } from "../hooks/useTowersConfig";
import { useEffect, useMemo, useState } from "react";

export function ConfigurationSection() {
  const { config, isLoadingConfig, isSaving, saveError, save, reload } =
    useTowersConfig();
  const [draft, setDraft] = useState<{ minBet: number; maxBet: number } | null>(
    null,
  );
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (config && draft === null) {
      setDraft({
        minBet: config.minBet,
        maxBet: config.maxBet,
      });
    }
  }, [config, draft]);

  const dirty = useMemo(() => {
    if (!draft || !config) return false;
    return draft.minBet !== config.minBet || draft.maxBet !== config.maxBet;
  }, [draft, config]);

  const errors = useMemo(() => {
    if (!draft) return [];
    const e: string[] = [];
    if (draft.minBet >= draft.maxBet) e.push("Min bet must be less than max bet.");
    if (draft.minBet < 0.01) e.push("Min bet must be at least 0.01.");
    return e;
  }, [draft]);

  const persist = async () => {
    if (!draft || errors.length || isSaving) return;
    await save({ minBet: draft.minBet, maxBet: draft.maxBet });
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
    void reload();
  };

  const busy = !draft || isLoadingConfig;

  return (
    <section id="config" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Configuration</h2>
        <p className="text-sm text-zinc-500">
          Min and max stake per Towers round. Stored in Redis (
          <code className="text-zinc-400">towers:admin:config</code>
          ). The game API reads the same key (short in-memory cache on the API).
        </p>
      </div>

      <PanelCard title="Bet limits" subtitle="Enforced on game start">
        {saveError ? (
          <p className="mb-3 text-sm text-rose-400">{saveError}</p>
        ) : null}
        {toast ? (
          <p className="mb-3 text-sm text-emerald-400">Saved to Redis.</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="towers-min-bet"
            label="Min bet"
            type="number"
            step="0.01"
            disabled={busy}
            value={draft?.minBet ?? ""}
            onChange={(v) =>
              setDraft((d) => (d ? { ...d, minBet: Number(v) } : d))
            }
          />
          <InputField
            id="towers-max-bet"
            label="Max bet"
            type="number"
            step="0.01"
            disabled={busy}
            value={draft?.maxBet ?? ""}
            onChange={(v) =>
              setDraft((d) => (d ? { ...d, maxBet: Number(v) } : d))
            }
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {dirty ? (
            <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              Unsaved changes
            </span>
          ) : null}
          <button
            type="button"
            disabled={!dirty || errors.length > 0 || isSaving || busy}
            onClick={() => void persist()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save to Redis"}
          </button>
        </div>
        {errors.length ? (
          <ul className="mt-3 list-inside list-disc text-sm text-amber-200/90">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
      </PanelCard>
    </section>
  );
}
