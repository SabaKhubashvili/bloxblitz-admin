"use client";

import {
  AdminPetSearchField,
  type AdminPetSelection,
} from "@/app/(admin)/components/AdminPetSearchField";
import { useEffect, useState } from "react";
import { cn } from "../../mines/components/cn";
import {
  useRewardCase,
  useUpdateRewardCase,
  useAddRewardCaseItem,
  useUpdateRewardCaseItem,
  useDeleteRewardCaseItem,
} from "../hooks/useRewardCases";
import type { RewardCaseSummaryApi } from "@/lib/admin-api/reward-cases";

const VARIANTS = ["M", "N", "F", "R"] as const;

function VariantPick({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {VARIANTS.map((v) => (
        <label
          key={v}
          className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400"
        >
          <input
            type="checkbox"
            checked={value.includes(v)}
            onChange={(e) => {
              if (e.target.checked) onChange([...value, v]);
              else onChange(value.filter((x) => x !== v));
            }}
            className="rounded border-zinc-600"
          />
          {v}
        </label>
      ))}
    </div>
  );
}

type Tab = "settings" | "pool";

interface StatusMessageProps {
  msg: string | null;
}

function StatusMessage({ msg }: StatusMessageProps) {
  if (!msg) return null;
  const isError =
    msg.toLowerCase().includes("fail") ||
    msg.toLowerCase().includes("invalid") ||
    msg.toLowerCase().includes("error");
  return (
    <p
      role="status"
      className={cn(
        "text-xs",
        isError ? "text-rose-400" : "text-emerald-400",
      )}
    >
      {msg}
    </p>
  );
}

interface Props {
  caseId: string;
  onClose: () => void;
}

export function RewardCaseEditModal({ caseId, onClose }: Props) {
  const {
    data: caseData,
    isLoading,
    isError,
    error,
  } = useRewardCase(caseId);

  const updateCase = useUpdateRewardCase();
  const addItem = useAddRewardCaseItem();
  const updateItem = useUpdateRewardCaseItem();
  const deleteItem = useDeleteRewardCaseItem();

  const [tab, setTab] = useState<Tab>("settings");
  const [draft, setDraft] = useState<RewardCaseSummaryApi | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [newPetPick, setNewPetPick] = useState<AdminPetSelection | null>(null);
  const [newWeight, setNewWeight] = useState("100");
  const [newVariants, setNewVariants] = useState<string[]>([]);

  useEffect(() => {
    if (caseData) setDraft(caseData);
  }, [caseData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- modal case target changed
    setNewPetPick(null);
  }, [caseId]);

  // Clear feedback when switching tabs
  useEffect(() => {
    setMsg(null);
  }, [tab]);

  const busy =
    updateCase.isPending ||
    addItem.isPending ||
    updateItem.isPending ||
    deleteItem.isPending;

  const handleSaveSettings = async () => {
    if (!draft) return;
    setMsg(null);
    try {
      await updateCase.mutateAsync({
        id: draft.id,
        body: {
          title: draft.title,
          imageUrl: draft.imageUrl,
          position: draft.position,
          isRakebackCase: draft.isRakebackCase,
          milestoneLevel: draft.milestoneLevel,
          isActive: draft.isActive,
          receivesWagerKeys: draft.receivesWagerKeys,
          wagerCoinsPerKey: draft.wagerCoinsPerKey,
          wagerKeysMaxPerEvent: draft.wagerKeysMaxPerEvent,
          levelUpKeysOverride: draft.levelUpKeysOverride,
          xpMilestoneThreshold: draft.xpMilestoneThreshold,
          xpMilestoneMaxKeysPerEvent: draft.xpMilestoneMaxKeysPerEvent,
          requiredLevel: draft.requiredLevel,
        },
      });
      setMsg("Settings saved successfully.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const handleAddItem = async () => {
    if (!draft) return;
    const petId = newPetPick?.id;
    const weight = Number(newWeight);
    if (petId == null || !Number.isFinite(petId) || petId < 1) {
      setMsg("Select a pet from search.");
      return;
    }
    if (!Number.isFinite(weight) || weight < 0) {
      setMsg("Enter a valid weight (0 or above).");
      return;
    }
    setMsg(null);
    try {
      await addItem.mutateAsync({
        caseId: draft.id,
        body: {
          petId,
          weight,
          variant: newVariants as ("M" | "N" | "F" | "R")[],
        },
      });
      setNewPetPick(null);
      setNewWeight("100");
      setNewVariants([]);
      setMsg("Pool item added.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to add item.");
    }
  };

  const handlePatchItem = async (
    itemId: string,
    patch: Record<string, unknown>,
  ) => {
    if (!draft) return;
    setMsg(null);
    try {
      await updateItem.mutateAsync({ caseId: draft.id, itemId, body: patch });
      setMsg("Item updated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to update item.");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!draft) return;
    setMsg(null);
    try {
      await deleteItem.mutateAsync({ caseId: draft.id, itemId });
      setMsg("Item removed.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to remove item.");
    }
  };

  // After a mutation, use the freshly-fetched data from the cache
  const prizes = caseData?.prizes ?? draft?.prizes ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl">
        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">
              {isLoading ? "Loading…" : (caseData?.title ?? "Edit reward case")}
            </h2>
            {caseData && (
              <p className="mt-0.5 font-mono text-xs text-zinc-500">
                {caseData.slug}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-4 shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-zinc-800 px-5">
          {(["settings", "pool"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t === "settings" ? "Settings" : "Prize pool"}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading || !draft ? (
            <p className="text-sm text-zinc-500">Loading case data…</p>
          ) : isError ? (
            <p className="text-sm text-rose-400">
              {error instanceof Error ? error.message : "Failed to load case."}
            </p>
          ) : tab === "settings" ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs text-zinc-500">
                  Title
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>

                <label className="block text-xs text-zinc-500">
                  Slug (read-only)
                  <input
                    value={draft.slug}
                    readOnly
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500"
                  />
                </label>

                <label className="block text-xs text-zinc-500">
                  Image URL
                  <input
                    value={draft.imageUrl}
                    onChange={(e) =>
                      setDraft({ ...draft, imageUrl: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>

                <label className="block text-xs text-zinc-500">
                  Position
                  <input
                    type="number"
                    value={draft.position}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        position: Number(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>

                <label className="block text-xs text-zinc-500">
                  Milestone level (optional)
                  <input
                    type="number"
                    placeholder="—"
                    value={draft.milestoneLevel ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        milestoneLevel:
                          e.target.value === ""
                            ? null
                            : Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>

                <label className="block text-xs text-zinc-500">
                  Required level to unlock
                  <span className="ml-1 font-normal text-zinc-600">
                    — 0 = no restriction
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={draft.requiredLevel}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        requiredLevel: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-amber-700/60 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <label className="block text-xs text-zinc-500">
                  XP milestone threshold
                  <span className="ml-1 font-normal text-zinc-600">
                    — 1 key per N XP (blank = disabled)
                  </span>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 100"
                    value={draft.xpMilestoneThreshold ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        xpMilestoneThreshold:
                          e.target.value === ""
                            ? null
                            : Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Max keys per XP event
                  <span className="ml-1 font-normal text-zinc-600">
                    — caps single-event burst
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={draft.xpMilestoneMaxKeysPerEvent}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        xpMilestoneMaxKeysPerEvent: Math.max(
                          1,
                          Number(e.target.value) || 1,
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-6 border-t border-zinc-800 pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) =>
                      setDraft({ ...draft, isActive: e.target.checked })
                    }
                  />
                  Active (visible in app)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={draft.isRakebackCase}
                    onChange={(e) =>
                      setDraft({ ...draft, isRakebackCase: e.target.checked })
                    }
                  />
                  Rakeback case
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={draft.receivesWagerKeys}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        receivesWagerKeys: e.target.checked,
                      })
                    }
                  />
                  Receives wager keys
                </label>
              </div>

              <div
                className={cn(
                  "grid gap-4 md:grid-cols-3",
                  !draft.receivesWagerKeys && "pointer-events-none opacity-40",
                )}
              >
                <label className="block text-xs text-zinc-500">
                  Coins per key (wager)
                  <input
                    type="number"
                    min={1}
                    disabled={!draft.receivesWagerKeys}
                    value={draft.wagerCoinsPerKey}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        wagerCoinsPerKey: Math.max(
                          1,
                          Number(e.target.value) || 1,
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 disabled:cursor-not-allowed"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Max keys per wager event
                  <input
                    type="number"
                    min={1}
                    disabled={!draft.receivesWagerKeys}
                    value={draft.wagerKeysMaxPerEvent}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        wagerKeysMaxPerEvent: Math.max(
                          1,
                          Number(e.target.value) || 1,
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 disabled:cursor-not-allowed"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Level-up keys override
                  <input
                    type="number"
                    min={0}
                    placeholder="default"
                    value={draft.levelUpKeysOverride ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        levelUpKeysOverride:
                          e.target.value === ""
                            ? null
                            : Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* ── Prize pool tab ── */
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Pet</th>
                      <th className="px-3 py-2">Weight</th>
                      <th className="px-3 py-2">Variants</th>
                      <th className="px-3 py-2">Order</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {prizes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-10 text-center text-zinc-500"
                        >
                          No items in this pool yet.
                        </td>
                      </tr>
                    ) : (
                      prizes.map((p) => (
                        <tr key={p.id} className="text-zinc-300">
                          <td className="px-3 py-2">
                            <span className="font-medium">{p.pet.name}</span>
                            <span className="ml-2 text-xs text-zinc-500">
                              #{p.petId}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              key={`w-${p.id}-${p.weight}`}
                              defaultValue={p.weight}
                              disabled={busy}
                              className="w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs disabled:opacity-50"
                              onBlur={(e) => {
                                const w = Number(e.target.value);
                                if (Number.isFinite(w) && w !== p.weight)
                                  void handlePatchItem(p.id, { weight: w });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-400">
                            {p.variant.join(", ") || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              key={`o-${p.id}-${p.sortOrder}`}
                              defaultValue={p.sortOrder}
                              disabled={busy}
                              className="w-20 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs disabled:opacity-50"
                              onBlur={(e) => {
                                const o = Number(e.target.value);
                                if (Number.isFinite(o) && o !== p.sortOrder)
                                  void handlePatchItem(p.id, { sortOrder: o });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDeleteItem(p.id)}
                              className="text-xs text-rose-400 hover:underline disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add item */}
              <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 md:grid-cols-4">
                <div className="text-xs text-zinc-500">
                  <span className="block">Pet (search by name)</span>
                  <AdminPetSearchField
                    key={`${caseId}-pet-pick-${newPetPick?.id ?? "none"}`}
                    inputId={`reward-edit-pet-search-${caseId}`}
                    selection={newPetPick}
                    onSelect={(snap) =>
                      setNewPetPick({ id: snap.id, name: snap.name })
                    }
                    onClear={() => setNewPetPick(null)}
                    disabled={busy}
                  />
                </div>
                <label className="text-xs text-zinc-500">
                  Weight
                  <input
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <div className="text-xs text-zinc-500 md:col-span-2">
                  Variants
                  <VariantPick value={newVariants} onChange={setNewVariants} />
                </div>
                <div className="md:col-span-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAddItem()}
                    className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {addItem.isPending ? "Adding…" : "Add to pool"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
          <StatusMessage msg={msg} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Close
            </button>
            {tab === "settings" && (
              <button
                type="button"
                disabled={busy || !draft}
                onClick={() => void handleSaveSettings()}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {updateCase.isPending ? "Saving…" : "Save settings"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
