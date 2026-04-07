"use client";

import {
  fetchMinesConfig,
  updateMinesConfig,
} from "@/lib/admin-api/mines-config";
import { MinesInputField } from "../components/MinesInputField";
import { MinesPanelCard } from "../components/MinesPanelCard";
import { MinesTabs } from "../components/MinesTabs";
import { useMinesAdmin } from "../context/MinesAdminContext";
import type { MinesGameConfig } from "../mock/types";
import { useEffect, useMemo, useState } from "react";

function serialize(c: MinesGameConfig) {
  return JSON.stringify(c);
}

export function ConfigurationSection() {
  const { config, setConfig } = useMinesAdmin();
  const [draft, setDraft] = useState<MinesGameConfig>(() => ({ ...config }));
  const [savedSnap, setSavedSnap] = useState(() => serialize(config));
  const [tab, setTab] = useState("eco");
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const c = await fetchMinesConfig();
        if (cancelled) return;
        setDraft((prev) => {
          const next: MinesGameConfig = {
            ...prev,
            minBet: c.minBet,
            maxBet: c.maxBet,
            houseEdgePercent: c.houseEdge,
            rtpTarget: c.rtpTarget,
          };
          setConfig(next);
          setSavedSnap(serialize(next));
          return next;
        });
      } catch (e) {
        console.error("[ConfigurationSection] fetch config failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setConfig]);

  const dirty = serialize(draft) !== savedSnap;
  const totalTiles = draft.gridSize * draft.gridSize;

  const errors = useMemo(() => {
    const e: string[] = [];
    if (draft.minBet >= draft.maxBet)
      e.push("Min bet must be less than max bet.");
    if (draft.defaultMinesCount >= totalTiles)
      e.push("Mines count must be less than total tiles.");
    if (draft.maxMinesAllowed >= totalTiles)
      e.push("Max mines must be less than total tiles.");
    if (draft.defaultMinesCount > draft.maxMinesAllowed)
      e.push("Default mines cannot exceed max mines allowed.");
    if (draft.houseEdgePercent < 0 || draft.houseEdgePercent > 100)
      e.push("House edge must be between 0% and 100%.");
    if (draft.rtpTarget < 0 || draft.rtpTarget > 100)
      e.push("RTP target must be between 0% and 100%.");
    if (draft.gameSpeedMs < 50 || draft.gameSpeedMs > 5000)
      e.push("Animation delay 50ms–5000ms.");
    return e;
  }, [draft, totalTiles]);

  const save = async () => {
    if (errors.length || submitting || loading) return;
    setSubmitting(true);
    try {
      await updateMinesConfig({
        minBet: draft.minBet,
        maxBet: draft.maxBet,
        houseEdge: draft.houseEdgePercent,
        rtpTarget: draft.rtpTarget,
      });
      setConfig(draft);
      setSavedSnap(serialize(draft));
      setToast(true);
      window.setTimeout(() => setToast(false), 2400);
    } catch (e) {
      console.error("[ConfigurationSection] save failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  const patch = (p: Partial<MinesGameConfig>) =>
    setDraft((d) => ({ ...d, ...p }));

  return (
    <section id="config" className="scroll-mt-28 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Configuration</h2>
          <p className="text-sm text-zinc-500">
            Grid, economy, and pacing — economy persisted via API.
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
            disabled={!dirty || errors.length > 0 || submitting || loading}
            onClick={() => void save()}
            className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {toast ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Saved.
        </div>
      ) : null}

      {errors.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-rose-400">
          {errors.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : null}

      <MinesTabs
        tabs={[
          { id: "eco", label: "Economy" },
        ]}
        active={tab}
        onChange={setTab}
      />
        <MinesPanelCard title="Economy">
          <div className="grid gap-4 sm:grid-cols-2">
            <MinesInputField
              id="min-bet"
              label="Min bet"
              type="number"
              value={draft.minBet}
              onChange={(v) => patch({ minBet: Number(v) || 0 })}
              step="0.01"
              disabled={loading || submitting}
            />
            <MinesInputField
              id="max-bet"
              label="Max bet"
              type="number"
              value={draft.maxBet}
              onChange={(v) => patch({ maxBet: Number(v) || 0 })}
              step="1"
              disabled={loading || submitting}
            />
            <MinesInputField
              id="edge"
              label="House edge"
              type="number"
              value={draft.houseEdgePercent}
              onChange={(v) =>
                patch({ houseEdgePercent: Number(v) || 0 })
              }
              suffix="%"
              step="0.1"
              disabled={loading || submitting}
            />
          </div>
        </MinesPanelCard>
    </section>
  );
}
