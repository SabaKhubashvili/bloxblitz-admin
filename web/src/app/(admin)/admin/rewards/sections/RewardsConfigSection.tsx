"use client";

import {
  AdminPetSearchField,
  type AdminPetSelection,
} from "@/app/(admin)/components/AdminPetSearchField";
import { ConfirmDialog } from "../../mines/components/ConfirmDialog";
import { MinesPanelCard } from "../../mines/components/MinesPanelCard";
import { cn } from "../../mines/components/cn";
import type { RewardCaseSummaryApi } from "@/lib/admin-api/reward-cases";
import { useEffect, useState } from "react";
import {
  REWARD_CASES_LIST_KEY,
  useAddRewardCaseItem,
  useCreateRewardCase,
  useDeleteRewardCase,
  useDeleteRewardCaseItem,
  useRewardCase,
  useRewardCasesList,
  useUpdateRewardCase,
  useUpdateRewardCaseItem,
} from "../hooks/useRewardCases";
import { useQueryClient } from "@tanstack/react-query";

const VARIANTS = ["M", "N", "F", "R"] as const;

function VariantPick({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
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

export function RewardsConfigSection() {
  const qc = useQueryClient();

  // ── List query ──
  const listQuery = useRewardCasesList({
    page: 1,
    pageSize: 99,
    sort: "position",
    order: "asc",
  });
  const list = listQuery.data?.items ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createSlug, setCreateSlug] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createImage, setCreateImage] = useState("");
  const [createPosition, setCreatePosition] = useState(0);

  // New pool-item state
  const [newPetPick, setNewPetPick] = useState<AdminPetSelection | null>(null);
  const [newWeight, setNewWeight] = useState("100");
  const [newVariants, setNewVariants] = useState<string[]>([]);

  // Auto-select first case once list loads
  useEffect(() => {
    if (!selectedId && list.length > 0 && list[0]) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  // ── Detail query ──
  const detailQuery = useRewardCase(selectedId);
  const serverDetail = detailQuery.data ?? null;

  // Local draft for the settings form (mirrors server state; patched on input)
  const [draft, setDraft] = useState<RewardCaseSummaryApi | null>(null);
  useEffect(() => {
    if (serverDetail) setDraft(serverDetail);
  }, [serverDetail]);

  // ── Mutations ──
  const createCase = useCreateRewardCase();
  const updateCase = useUpdateRewardCase();
  const deleteCase = useDeleteRewardCase();
  const addItem = useAddRewardCaseItem();
  const updateItem = useUpdateRewardCaseItem();
  const deleteItem = useDeleteRewardCaseItem();

  const busy =
    createCase.isPending ||
    updateCase.isPending ||
    deleteCase.isPending ||
    addItem.isPending ||
    updateItem.isPending ||
    deleteItem.isPending;

  // ── Handlers ──
  const saveMeta = async () => {
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
        },
      });
      setMsg("Saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const onCreate = async () => {
    setMsg(null);
    try {
      const d = await createCase.mutateAsync({
        slug: createSlug.trim(),
        title: createTitle.trim(),
        imageUrl: createImage.trim(),
        position: createPosition,
      });
      setCreateOpen(false);
      setCreateSlug("");
      setCreateTitle("");
      setCreateImage("");
      setCreatePosition(0);
      setSelectedId(d.id);
      setMsg("Reward case created.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Create failed.");
    }
  };

  const addPoolItem = async () => {
    if (!draft) return;
    const petId = newPetPick?.id;
    const weight = Number(newWeight);
    if (petId == null || !Number.isFinite(petId) || petId < 1) {
      setMsg("Select a pet from search.");
      return;
    }
    if (!Number.isFinite(weight) || weight < 0) {
      setMsg("Enter a valid weight.");
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
      setMsg(e instanceof Error ? e.message : "Add item failed.");
    }
  };

  const patchItem = async (itemId: string, patch: Record<string, unknown>) => {
    if (!draft) return;
    setMsg(null);
    try {
      await updateItem.mutateAsync({ caseId: draft.id, itemId, body: patch });
      setMsg("Pool item updated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update item failed.");
    }
  };

  const removeItem = async (itemId: string) => {
    if (!draft) return;
    setMsg(null);
    try {
      await deleteItem.mutateAsync({ caseId: draft.id, itemId });
      setMsg("Pool item removed.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Delete item failed.");
    }
  };

  // Fresh prizes come from the query cache after each mutation
  const prizes = serverDetail?.prizes ?? draft?.prizes ?? [];

  return (
    <section className="space-y-6">
      <MinesPanelCard
        title="Reward configuration"
        subtitle="Wager thresholds, activation, level-up key overrides, and weighted prize pool (pets)."
        headerRight={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
          >
            New reward case
          </button>
        }
      >
        <div className="space-y-6 px-5 py-4">
          {msg ? (
            <p className="text-sm text-zinc-400" role="status">
              {msg}
            </p>
          ) : null}

          {/* Case selector */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-xs text-zinc-500">
              Reward case
              <select
                value={selectedId ?? ""}
                onChange={(e) => {
                  setSelectedId(e.target.value || null);
                  setNewPetPick(null);
                  setMsg(null);
                }}
                className="mt-1 block w-72 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              >
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.position}. {c.title} ({c.slug})
                  </option>
                ))}
              </select>
            </label>
            {selectedId ? (
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedId)}
                className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10"
              >
                Delete case
              </button>
            ) : null}
          </div>

          {detailQuery.isError ? (
            <p className="text-sm text-rose-400">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Load failed."}
            </p>
          ) : null}

          {!draft ? (
            <p className="text-sm text-zinc-500">
              {detailQuery.isLoading ? "Loading…" : "Select a reward case."}
            </p>
          ) : (
            <>
              {/* Settings form */}
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
                    value={draft.milestoneLevel ?? ""}
                    placeholder="—"
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft({
                        ...draft,
                        milestoneLevel:
                          v === "" ? null : Math.max(0, Number(v) || 0),
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  XP milestone threshold
                  <span className="ml-1 text-zinc-600">(blank = disabled)</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 100"
                    value={draft.xpMilestoneThreshold ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft({
                        ...draft,
                        xpMilestoneThreshold:
                          v === "" ? null : Math.max(1, Number(v) || 1),
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Max keys per XP event
                  <span className="ml-1 text-zinc-600">(caps single-event burst)</span>
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
                  Receives keys from wagering
                </label>
              </div>

              <div
                className={cn(
                  "grid gap-4 md:grid-cols-3",
                  !draft.receivesWagerKeys && "opacity-50",
                )}
              >
                <label className="block text-xs text-zinc-500">
                  Coins per key (wager)
                  <input
                    type="number"
                    disabled={!draft.receivesWagerKeys}
                    value={draft.wagerCoinsPerKey}
                    min={1}
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
                    disabled={!draft.receivesWagerKeys}
                    value={draft.wagerKeysMaxPerEvent}
                    min={1}
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
                  Level-up keys override (blank = default from app config)
                  <input
                    type="number"
                    placeholder="default"
                    value={draft.levelUpKeysOverride ?? ""}
                    min={0}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft({
                        ...draft,
                        levelUpKeysOverride:
                          v === "" ? null : Math.max(0, Number(v) || 0),
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => void saveMeta()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {updateCase.isPending ? "Saving…" : "Save settings"}
              </button>

              {/* Prize pool */}
              <div className="border-t border-zinc-800 pt-6">
                <h4 className="text-sm font-semibold text-zinc-200">
                  Prize pool
                </h4>
                <p className="mt-1 text-xs text-zinc-500">
                  Weighted random rolls. Use pet IDs from your catalog.
                </p>

                <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Pet</th>
                        <th className="px-3 py-2">Weight</th>
                        <th className="px-3 py-2">Variants</th>
                        <th className="px-3 py-2">Order</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {prizes.map((p) => (
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
                                  void patchItem(p.id, { weight: w });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-xs">
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
                                  void patchItem(p.id, { sortOrder: o });
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void removeItem(p.id)}
                              className="text-xs text-rose-400 hover:underline disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add item row */}
                <div className="mt-4 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 md:grid-cols-4">
                  <div className="text-xs text-zinc-500">
                    <span className="block">Pet (search by name)</span>
                    <AdminPetSearchField
                      key={`${selectedId ?? ""}-pet-pick-${newPetPick?.id ?? "none"}`}
                      inputId="reward-pool-pet-search"
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
                  <div className="md:col-span-2">
                    <span className="text-xs text-zinc-500">Variants</span>
                    <VariantPick value={newVariants} onChange={setNewVariants} />
                  </div>
                  <div className="md:col-span-4">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void addPoolItem()}
                      className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {addItem.isPending ? "Adding…" : "Add pool item"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </MinesPanelCard>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteErr(null);
        }}
        title="Delete reward case?"
        description="Only allowed when no users have key history or opens for this case. Prefer deactivating instead."
        confirmLabel="Delete"
        busy={deleteCase.isPending}
        errorText={deleteErr}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteErr(null);
          try {
            await deleteCase.mutateAsync(deleteTarget);
            setDeleteTarget(null);
            setSelectedId(null);
            setDraft(null);
            // Refetch list so the selector updates
            await qc.invalidateQueries({ queryKey: REWARD_CASES_LIST_KEY });
            setMsg("Deleted.");
          } catch (e) {
            setDeleteErr(e instanceof Error ? e.message : "Delete failed.");
            throw e;
          }
        }}
      />

      {/* Create modal */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-100">
              New reward case
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-zinc-500">
                Slug
                <input
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="reward-tier-name"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Title
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Image URL
                <input
                  value={createImage}
                  onChange={(e) => setCreateImage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Position
                <input
                  type="number"
                  value={createPosition}
                  onChange={(e) =>
                    setCreatePosition(Number(e.target.value) || 0)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            </div>
            {msg && createOpen ? (
              <p className="mt-2 text-xs text-rose-400">{msg}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createCase.isPending}
                onClick={() => void onCreate()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {createCase.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
