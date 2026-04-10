"use client";

import { InputField } from "../../dice/components/InputField";
import { PanelCard } from "../../dice/components/PanelCard";
import { cn } from "../../dice/components/cn";
import {
  buildRouletteConfigPatch,
  DEFAULT_ROULETTE_CONFIG_API,
  type RouletteConfigApi,
} from "@/lib/admin-api/roulette-config-api";
import { useRouletteConfig } from "../hooks/useRouletteConfig";
import { useEffect, useMemo, useState } from "react";

export function ConfigurationSection() {
  const {
    config,
    isLoadingConfig,
    isSaving,
    savePartialConfig,
    saveError,
    resetSaveError,
  } = useRouletteConfig();

  const [draft, setDraft] = useState<RouletteConfigApi | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (config && draft === null) {
      setDraft({ ...config });
    }
  }, [config, draft]);

  const savedApi = config ?? DEFAULT_ROULETTE_CONFIG_API;

  const dirty = useMemo(() => {
    if (!draft) return false;
    return Object.keys(buildRouletteConfigPatch(savedApi, draft)).length > 0;
  }, [draft, savedApi]);

  const errors = useMemo(() => {
    if (!draft) return [];
    const e: string[] = [];
    if (draft.minBet >= draft.maxBet) {
      e.push("Min bet must be less than max bet.");
    }
    if (draft.minBet < 0.01) {
      e.push("Min bet must be at least 0.01.");
    }
    return e;
  }, [draft]);

  const inputsBusy = !draft || isSaving || isLoadingConfig;

  const save = async () => {
    if (!draft || errors.length || isSaving) return;
    const patch = buildRouletteConfigPatch(savedApi, draft);
    if (Object.keys(patch).length === 0) return;
    resetSaveError();
    try {
      const updated = await savePartialConfig(patch);
      setDraft({ ...updated });
      setToast(true);
      window.setTimeout(() => setToast(false), 2400);
    } catch {
      /* mutation error surfaced via saveError */
    }
  };

  const patch = (p: Partial<RouletteConfigApi>) => {
    resetSaveError();
    setDraft((d) => (d ? { ...d, ...p } : d));
  };

  const applyGameEnabled = async (enabled: boolean) => {
    if (draft?.gameEnabled === enabled) return;
    resetSaveError();
    try {
      const updated = await savePartialConfig({ gameEnabled: enabled });
      setDraft({ ...updated });
      setToast(true);
      window.setTimeout(() => setToast(false), 2400);
    } catch {
      /* surfaced via saveError */
    }
  };

  const applyBettingEnabled = async (enabled: boolean) => {
    if (draft?.bettingEnabled === enabled) return;
    resetSaveError();
    try {
      const updated = await savePartialConfig({ bettingEnabled: enabled });
      setDraft({ ...updated });
      setToast(true);
      window.setTimeout(() => setToast(false), 2400);
    } catch {
      /* surfaced via saveError */
    }
  };

  return (
    <section id="config" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Configuration</h2>
          <p className="text-sm text-zinc-500">
            Min/max stake, betting on/off, and full game on/off — stored in Redis (
            <code className="text-zinc-400">roulette:admin:config</code>). The
            WebSocket service enforces limits and availability; clients cannot
            override this.
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
            disabled={!dirty || errors.length > 0 || inputsBusy}
            onClick={() => void save()}
            className="rounded-xl border border-sky-500/50 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save stake limits"}
          </button>
        </div>
      </div>

      {saveError ? (
        <p className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {saveError instanceof Error ? saveError.message : "Save failed."}
        </p>
      ) : null}

      {toast ? (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          Configuration saved.
        </p>
      ) : null}

      {errors.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-amber-200/90">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard
          title="Stake limits"
          subtitle="Enforced on every bet in the WebSocket gateway (authoritative)."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="roulette-min-bet"
              label="Min bet"
              type="number"
              step="0.01"
              value={draft?.minBet ?? ""}
              onChange={(v) => patch({ minBet: Number(v) })}
              disabled={inputsBusy}
            />
            <InputField
              id="roulette-max-bet"
              label="Max bet"
              type="number"
              step="0.01"
              value={draft?.maxBet ?? ""}
              onChange={(v) => patch({ maxBet: Number(v) })}
              disabled={inputsBusy}
            />
          </div>
        </PanelCard>

        <PanelCard
          title="Player betting"
          subtitle="Watch-only mode — rounds keep running, no stakes accepted"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-2">
              <p
                className={cn(
                  "inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  draft?.bettingEnabled
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300",
                )}
              >
                {draft?.bettingEnabled ? "Betting on" : "Betting off"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={inputsBusy || draft?.bettingEnabled === true}
                onClick={() => void applyBettingEnabled(true)}
                className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Enable betting
              </button>
              <button
                type="button"
                disabled={inputsBusy || draft?.bettingEnabled === false}
                onClick={() => void applyBettingEnabled(false)}
                className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Disable betting
              </button>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          title="Roulette availability"
          subtitle="Full stop — saved immediately to Redis"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-2">
              <p
                className={cn(
                  "inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  draft?.gameEnabled
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300",
                )}
              >
                {draft?.gameEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={inputsBusy || draft?.gameEnabled === true}
                onClick={() => void applyGameEnabled(true)}
                className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Enable roulette
              </button>
              <button
                type="button"
                disabled={inputsBusy || draft?.gameEnabled === false}
                onClick={() => void applyGameEnabled(false)}
                className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Disable roulette
              </button>
            </div>
          </div>
        </PanelCard>
      </div>
    </section>
  );
}
