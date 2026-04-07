"use client";

import type { CoinflipEconomyConfig } from "@/lib/admin-api/coinflip-economy";
import { CoinflipInputField } from "../components/CoinflipInputField";
import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { CoinflipTabs } from "../components/CoinflipTabs";
import { CoinflipToggle } from "../components/CoinflipToggle";
import { useCoinflipAdmin } from "../context/CoinflipAdminContext";
import { useCoinflipEconomy } from "../hooks/useCoinflipEconomy";
import { cn } from "../components/cn";
import { useCallback, useEffect, useMemo, useState } from "react";

function buildEconomyPatch(
  draft: CoinflipEconomyConfig,
  baseline: CoinflipEconomyConfig,
): Partial<CoinflipEconomyConfig> {
  const patch: Partial<CoinflipEconomyConfig> = {};
  if (draft.minBet !== baseline.minBet) patch.minBet = draft.minBet;
  if (draft.maxBet !== baseline.maxBet) patch.maxBet = draft.maxBet;
  if (draft.platformFee !== baseline.platformFee)
    patch.platformFee = draft.platformFee;
  if (draft.maxActiveGames !== baseline.maxActiveGames)
    patch.maxActiveGames = draft.maxActiveGames;
  if (draft.maxGamesPerUser !== baseline.maxGamesPerUser)
    patch.maxGamesPerUser = draft.maxGamesPerUser;
  return patch;
}

export function ConfigurationSection() {
  const { config, setConfig } = useCoinflipAdmin();
  const [tab, setTab] = useState("economy");2 

  const economyQuery = useCoinflipEconomy();
  const {
    data: economyData,
    isPending: economyLoading,
    isError: economyLoadError,
    error: economyLoadErr,
    refetch: refetchEconomy,
    isFetching: economyFetching,
    updateEconomy,
    isSaving,
    saveError,
    resetSaveError,
  } = economyQuery;

  const [economyDraft, setEconomyDraft] = useState<CoinflipEconomyConfig | null>(
    null,
  );
  const [economyDirty, setEconomyDirty] = useState(false);

  useEffect(() => {
    if (economyData && !economyDirty) {
      setEconomyDraft(economyData);
    }
  }, [economyData, economyDirty]);

  const patchEconomyDraft = useCallback((patch: Partial<CoinflipEconomyConfig>) => {
    setEconomyDraft((d) => (d ? { ...d, ...patch } : d));
    setEconomyDirty(true);
    resetSaveError();
  }, [resetSaveError]);

  const economyErrors = useMemo(() => {
    const e: string[] = [];
    const d = economyDraft;
    if (!d) return e;
    if (!(d.minBet > 0)) e.push("Min bet must be greater than 0.");
    if (!(d.maxBet > 0)) e.push("Max bet must be greater than 0.");
    if (d.minBet >= d.maxBet) e.push("Min bet must be less than max bet.");
    if (d.platformFee < 0 || d.platformFee > 100) {
      e.push("Platform fee must be between 0% and 100%.");
    }
    if (!Number.isInteger(d.maxActiveGames) || d.maxActiveGames < 1) {
      e.push("Max active games must be an integer ≥ 1.");
    }
    if (!Number.isInteger(d.maxGamesPerUser) || d.maxGamesPerUser < 1) {
      e.push("Max games per user must be an integer ≥ 1.");
    }
    return e;
  }, [economyDraft]);

  const loadEconomyMessage =
    economyLoadError && economyLoadErr instanceof Error
      ? economyLoadErr.message
      : economyLoadError
        ? "Failed to load economy settings."
        : null;

  const saveEconomyMessage =
    saveError instanceof Error ? saveError.message : saveError ? "Save failed." : null;

  const onDiscardEconomy = () => {
    if (economyData) {
      setEconomyDraft(economyData);
    }
    setEconomyDirty(false);
    resetSaveError();
  };

  const onSaveEconomy = async () => {
    if (!economyData || !economyDraft || economyErrors.length > 0) return;
    const patch = buildEconomyPatch(economyDraft, economyData);
    if (Object.keys(patch).length === 0) {
      setEconomyDirty(false);
      return;
    }
    try {
      const next = await updateEconomy(patch);
      setEconomyDraft(next);
      setEconomyDirty(false);
    } catch {
      /* mutation error surfaced via saveError */
    }
  };


  const combinedTabErrors = tab === "economy" ? economyErrors : [];

  return (
    <section id="config" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Configuration</h2>
        <p className="text-sm text-zinc-500">
          Economy limits live in Redis; game-mode toggles below are mock-dashboard
          only until APIs exist.
        </p>
      </div>

      <CoinflipTabs
        tabs={[
          { id: "economy", label: "Economy & caps" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loadEconomyMessage && tab === "economy" ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {loadEconomyMessage}
          <button
            type="button"
            onClick={() => void refetchEconomy()}
            className="ml-3 text-sky-400 underline hover:text-sky-300"
          >
            Retry
          </button>
        </div>
      ) : null}

      {saveEconomyMessage && tab === "economy" ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {saveEconomyMessage}
        </div>
      ) : null}

      {combinedTabErrors.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-rose-400">
          {combinedTabErrors.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : null}
        <CoinflipPanelCard title="Stakes & caps (Redis)">
          <p className="mb-4 text-xs text-zinc-500">
            Values are read and written via{" "}
            <span className="font-mono text-zinc-400">GET/POST /admin/coinflip/economy</span>
            . Enforcing them in the game service is a separate integration step.
            {economyFetching && !economyLoading ? (
              <span className="ml-2 text-sky-400/90">Refreshing…</span>
            ) : null}
          </p>

          {economyLoading && !economyDraft ? (
            <p className="text-sm text-zinc-500">Loading economy settings…</p>
          ) : economyDraft ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <CoinflipInputField
                  id="cf-min"
                  label="Min bet"
                  type="number"
                  value={economyDraft.minBet}
                  onChange={(v) => patchEconomyDraft({ minBet: Number(v) || 0 })}
                  step="0.01"
                  min="0"
                  disabled={isSaving}
                />
                <CoinflipInputField
                  id="cf-max"
                  label="Max bet"
                  type="number"
                  value={economyDraft.maxBet}
                  onChange={(v) => patchEconomyDraft({ maxBet: Number(v) || 0 })}
                  step="1"
                  min="0"
                  disabled={isSaving}
                />
                <CoinflipInputField
                  id="cf-fee"
                  label="Platform fee"
                  type="number"
                  value={economyDraft.platformFee}
                  onChange={(v) =>
                    patchEconomyDraft({ platformFee: Number(v) || 0 })
                  }
                  suffix="%"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={isSaving}
                />
                <CoinflipInputField
                  id="cf-max-active"
                  label="Max active games"
                  type="number"
                  value={economyDraft.maxActiveGames}
                  onChange={(v) => {
                    const n = Number(v);
                    patchEconomyDraft({
                      maxActiveGames: Number.isFinite(n)
                        ? Math.trunc(n)
                        : economyDraft.maxActiveGames,
                    });
                  }}
                  min="1"
                  step="1"
                  disabled={isSaving}
                />
                <CoinflipInputField
                  id="cf-max-per-user"
                  label="Max games per user"
                  type="number"
                  value={economyDraft.maxGamesPerUser}
                  onChange={(v) => {
                    const n = Number(v);
                    patchEconomyDraft({
                      maxGamesPerUser: Number.isFinite(n)
                        ? Math.trunc(n)
                        : economyDraft.maxGamesPerUser,
                    });
                  }}
                  min="1"
                  step="1"
                  disabled={isSaving}
                />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void onSaveEconomy()}
                  disabled={
                    !economyDirty ||
                    economyErrors.length > 0 ||
                    isSaving ||
                    !!loadEconomyMessage
                  }
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    economyDirty && economyErrors.length === 0 && !loadEconomyMessage
                      ? "bg-sky-600 text-white hover:bg-sky-500"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-500",
                  )}
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={onDiscardEconomy}
                  disabled={!economyDirty || isSaving || !!loadEconomyMessage}
                  className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void refetchEconomy()}
                  disabled={isSaving || economyLoading}
                  className="text-sm text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  Refresh from server
                </button>
              </div>
            </>
          ) : null}
        </CoinflipPanelCard>
    </section>
  );
}
