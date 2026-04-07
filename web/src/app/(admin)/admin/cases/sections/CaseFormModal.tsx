"use client";

import { Modal } from "@/components/ui/modal";
import { CaseInputField } from "../components/CaseInputField";
import { CaseSelect } from "../components/CaseSelect";
import { CaseToggleSwitch } from "../components/CaseToggleSwitch";
import { ImageUploader } from "../components/ImageUploader";
import { RARITY_LABEL } from "../components/rarityStyles";
import { cn } from "../components/cn";
import {
  CASE_COVER_CDN_BASE,
  type CaseVariantPayload,
  type CreateCasePayload,
} from "@/lib/admin-api/create-case";
import {
  searchPetsByName,
  type PetSnapshotApi,
} from "@/lib/admin-api/pets";
import { resolvePetValueForCaseItemVariants } from "@/lib/case-item-pet-value";
import type {
  CaseRecord,
  CaseRewardItem,
  CaseStatus,
} from "../mock/types";
import { mapDbPetRarityToItemRarity } from "../mock/pet-rarity";
import { isDatabaseCaseId } from "../utils/database-case-id";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const DND = "CASE_REWARD_ITEM";

const CASE_VARIANT_OPTIONS = [
  { value: "STANDARD", label: "Standard" },
  { value: "FEATURED", label: "Featured" },
  { value: "HIGH_RISK", label: "High risk" },
] as const;

const VARIANT_CODES = ["M", "N", "F", "R"] as const;

function VariantToggles({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const upper = new Set(selected.map((s) => s.toUpperCase()));
  const toggle = (code: string) => {
    const u = code.toUpperCase();
    const next = new Set(upper);
    if (next.has(u)) next.delete(u);
    else next.add(u);
    onChange(VARIANT_CODES.filter((c) => next.has(c)));
  };
  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <p className="mb-1.5 text-xs font-medium text-zinc-400">
        Variant (M / N line, F / R potions)
      </p>
      <div className="flex flex-wrap gap-2">
        {VARIANT_CODES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
              upper.has(code)
                ? "border-violet-500/60 bg-violet-600/25 text-violet-200"
                : "border-zinc-700 text-zinc-500 hover:border-zinc-600",
            )}
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}

function sumChance(items: CaseRewardItem[]) {
  return items.reduce((s, i) => s + (Number(i.dropChance) || 0), 0);
}

/** Usable `src` for the case cover when no new file is selected. */
function resolveCaseCoverDisplayUrl(editing: CaseRecord | null): string | null {
  if (!editing) return null;
  const raw = editing.imageUrl?.trim();
  if (raw) {
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) return raw;
    if (raw.startsWith("/")) return `${CASE_COVER_CDN_BASE}${raw}`;
    return raw;
  }
  if (isDatabaseCaseId(editing.id)) {
    return `${CASE_COVER_CDN_BASE}/cases/${editing.id}.webp`;
  }
  return null;
}

function newItem(): CaseRewardItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    petId: null,
    name: "",
    imageUrl: null,
    value: 1,
    dropChance: 0,
    rarity: "common",
    variant: [],
    petValues: null,
  };
}

function RewardRow({
  item,
  index,
  onChange,
  onRemove,
  onMove,
}: {
  item: CaseRewardItem;
  index: number;
  onChange: (i: CaseRewardItem) => void;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [petNameQuery, setPetNameQuery] = useState("");
  const [petResults, setPetResults] = useState<PetSnapshotApi[]>([]);
  const [searchingPet, setSearchingPet] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    setLoadErr(null);
    setPetResults([]);
    setPetNameQuery("");
  }, [item.petId, item.id]);

  useEffect(() => {
    if (item.petId != null) return;

    const q = petNameQuery.trim().toLowerCase();
    if (q.length === 0) {
      setPetResults([]);
      setSearchingPet(false);
      return;
    }

    let cancelled = false;
    setSearchingPet(true);
    const t = window.setTimeout(() => {
      void searchPetsByName(q)
        .then((rows) => {
          if (cancelled) return;
          setPetResults(rows);
          setLoadErr(null);
        })
        .catch(() => {
          if (cancelled) return;
          setPetResults([]);
          setLoadErr("Search failed — try again");
        })
        .finally(() => {
          if (!cancelled) setSearchingPet(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setSearchingPet(false);
    };
  }, [petNameQuery, item.petId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setPetResults([]);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const applySnapshot = (snap: PetSnapshotApi) => {
    setLoadErr(null);
    onChange({
      ...item,
      petId: snap.id,
      name: snap.name,
      imageUrl: snap.image,
      rarity: mapDbPetRarityToItemRarity(snap.rarity),
      petValues: snap.values,
      value: resolvePetValueForCaseItemVariants(snap.values, item.variant),
    });
    setPetNameQuery("");
    setPetResults([]);
  };

  const clearPet = () => {
    setLoadErr(null);
    setPetNameQuery("");
    setPetResults([]);
    onChange({
      ...item,
      petId: null,
      name: "",
      imageUrl: null,
      petValues: null,
      value: item.value,
    });
  };

  const [{ isDragging }, dragRef] = useDrag({
    type: DND,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, dropRef] = useDrop({
    accept: DND,
    drop: (dragged: { index: number }) => {
      if (dragged.index !== index) onMove(dragged.index, index);
    },
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      dragRef(node);
      dropRef(node);
    },
    [dragRef, dropRef],
  );

  const valueFromPet = !!item.petValues;

  const onVariantChange = (variant: string[]) => {
    const next: CaseRewardItem = { ...item, variant };
    if (item.petValues) {
      next.value = resolvePetValueForCaseItemVariants(item.petValues, variant);
    }
    onChange(next);
  };

  return (
    <div
      ref={setRefs}
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 transition-opacity",
        isDragging && "opacity-50",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="cursor-grab text-xs text-zinc-500 active:cursor-grabbing">
          ⋮⋮ Drag
        </span>
        <p className="font-mono text-[10px] text-zinc-600" title={item.id}>
          Case item: {item.id.slice(0, 8)}…
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-rose-400 hover:underline"
        >
          Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VariantToggles selected={item.variant} onChange={onVariantChange} />

        <div
          ref={searchWrapRef}
          className="sm:col-span-2 lg:col-span-2 space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-3"
        >
          <p className="text-xs font-medium text-zinc-400">
            Pet (search by name, partial match)
          </p>
          {item.petId != null ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-zinc-200">
                #{item.petId}{" "}
                <span className="text-zinc-400 font-sans font-normal">
                  {item.name || ""}
                </span>
              </p>
              <button
                type="button"
                onClick={() => clearPet()}
                className="text-xs text-violet-400 hover:underline"
              >
                Change pet
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={petNameQuery}
                onChange={(e) => setPetNameQuery(e.target.value)}
                placeholder="e.g. dragon, frost fury…"
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
              {searchingPet ? (
                <p className="mt-1 text-[11px] text-zinc-500">Searching…</p>
              ) : null}
              {petResults.length > 0 ? (
                <ul
                  className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
                  role="listbox"
                >
                  {petResults.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => applySnapshot(p)}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded border border-zinc-700 object-cover"
                        />
                        <span className="min-w-0 truncate">
                          <span className="font-mono text-zinc-500">#{p.id}</span>{" "}
                          {p.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : petNameQuery.trim().length > 0 && !searchingPet ? (
                <p className="mt-1 text-[11px] text-zinc-500">No matches</p>
              ) : null}
            </div>
          )}
          {loadErr ? (
            <p className="text-xs text-rose-400">{loadErr}</p>
          ) : null}
          {item.imageUrl ? (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                className="h-14 w-14 rounded-lg border border-zinc-700 object-cover"
              />
            </div>
          ) : null}
          <div className="mt-2">
            <p className="mb-1 text-xs font-medium text-zinc-400">Name (from pet)</p>
            <p className="text-sm font-medium text-zinc-100">
              {item.name || "—"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-400">
              Rarity (from pet)
            </p>
            <span
              className={cn(
                "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                RARITY_LABEL[item.rarity],
              )}
            >
              {item.rarity}
            </span>
          </div>
        </div>

        <CaseInputField
          id={`${item.id}-value`}
          label={valueFromPet ? "Value (from pet × variant)" : "Value"}
          type="number"
          value={item.value}
          onChange={(v) => onChange({ ...item, value: Number(v) || 0 })}
          step="0.01"
          min="0"
          disabled={valueFromPet}
        />
        <CaseInputField
          id={`${item.id}-chance`}
          label="Drop %"
          type="number"
          value={item.dropChance}
          onChange={(v) =>
            onChange({ ...item, dropChance: Number(v) || 0 })
          }
          step="0.1"
          min="0"
          max="100"
        />
      </div>
    </div>
  );
}

interface CaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = create */
  editing: CaseRecord | null;
  onSave: (c: CaseRecord) => void;
  /** When set, UUID cases are PATCHed to admin-api before `onSave`. */
  persistCase?: (
    c: CaseRecord,
    coverFile: File | null,
  ) => Promise<{ imageUrl: string | null } | void>;
  /** When set, new cases are POSTed to admin-api (requires slug + pets on items). */
  createCase?: (payload: CreateCasePayload) => Promise<{ id: string }>;
}

export function CaseFormModal({
  isOpen,
  onClose,
  editing,
  onSave,
  persistCase,
  createCase,
}: CaseFormModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [caseVariant, setCaseVariant] = useState<CaseVariantPayload>("STANDARD");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [price, setPrice] = useState("1");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CaseStatus>("active");
  const [items, setItems] = useState<CaseRewardItem[]>([]);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [persisting, setPersisting] = useState(false);
  const [coverPreviewBlobUrl, setCoverPreviewBlobUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const coverPreviewSrc =
    coverPreviewBlobUrl ?? resolveCaseCoverDisplayUrl(editing);

  useEffect(() => {
    if (!isOpen) return;
    setPersistError(null);
  }, [isOpen]);

  // Only re-hydrate when the sheet opens/closes or the edited case id changes.
  // Depending on the whole `editing` object clears `coverFile` whenever the parent
  // passes a new reference (same case), so the uploaded file never reaches persist.
  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setName(editing.name);
      setCoverFile(null);
      setPrice(String(editing.price));
      setDescription(editing.description);
      setStatus(editing.status);
      setItems(
        editing.items.map((i) => ({
          ...i,
          petId: i.petId ?? null,
          variant: i.variant?.length ? [...i.variant] : [],
          petValues: i.petValues ? { ...i.petValues } : null,
        })),
      );
    } else {
      setName("");
      setSlug("");
      setCaseVariant("STANDARD");
      setCoverFile(null);
      setPrice("1");
      setDescription("");
      setStatus("active");
      setItems([newItem()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit `editing` fields; see note above
  }, [isOpen, editing?.id]);

  const totalChance = useMemo(() => sumChance(items), [items]);
  const chanceOk = Math.abs(totalChance - 100) < 0.05;
  const priceNum = Number(price);
  const priceOk = priceNum > 0;
  const itemsOk = items.length >= 1;

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!itemsOk) e.push("Add at least one reward item.");
    if (!priceOk) e.push("Price must be greater than 0.");
    if (!chanceOk)
      e.push(
        `Drop chances must total 100% (currently ${totalChance.toFixed(1)}%).`
      );
    return e;
  }, [itemsOk, priceOk, chanceOk, totalChance]);

  const move = useCallback((from: number, to: number) => {
    setItems((prev) => {
      const n = [...prev];
      const [x] = n.splice(from, 1);
      n.splice(to, 0, x);
      return n;
    });
  }, []);

  const handleSave = async () => {
    if (errors.length) return;
    setPersistError(null);
    const provisionalId = editing?.id ?? `case-${Date.now()}`;
    let record: CaseRecord = {
      id: provisionalId,
      name: name.trim() || "Untitled case",
      imageUrl: coverFile
        ? coverFile.name
        : (editing?.imageUrl ?? null),
      price: priceNum,
      description: description.trim(),
      status,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      totalOpened: editing?.totalOpened ?? 0,
      items: items.map((i) => ({ ...i })),
    };

    if (createCase && !editing) {
      const s = slug.trim().toLowerCase();
      if (!s) {
        setPersistError(
          "Enter a URL slug (e.g. neon-starter) to create the case in the database.",
        );
        return;
      }
      if (record.items.some((i) => i.petId == null)) {
        setPersistError(
          "Each reward must have a Pet ID (use “Load pet”) before saving to the database.",
        );
        return;
      }
      try {
        setPersisting(true);
        const { id } = await createCase({
          slug: s,
          name: record.name,
          coverImage: coverFile,
          price: record.price,
          variant: caseVariant,
          isActive: record.status === "active",
          sortOrder: 0,
          riskLevel: 0,
          items: record.items.map((it, sortOrder) => ({
            petId: it.petId!,
            dropChance: it.dropChance,
            sortOrder,
            variant: it.variant,
          })),
        });
        const imageUrl = coverFile
          ? `${CASE_COVER_CDN_BASE}/cases/${id}.webp`
          : null;
        record = { ...record, id, imageUrl };
      } catch (e) {
        setPersistError(
          e instanceof Error
            ? e.message
            : "Could not create case in admin-api.",
        );
        return;
      } finally {
        setPersisting(false);
      }
      onSave(record);
      onClose();
      return;
    }

    const shouldPersist =
      persistCase && editing && isDatabaseCaseId(editing.id);

    if (shouldPersist) {
      if (record.items.some((i) => i.petId == null)) {
        setPersistError(
          "Each reward must have a Pet ID (use “Load pet”) before saving to the database.",
        );
        return;
      }
      try {
        setPersisting(true);
        const persisted = await persistCase(record, coverFile);
        if (persisted?.imageUrl !== undefined) {
          record = { ...record, imageUrl: persisted.imageUrl };
        }
      } catch (e) {
        setPersistError(
          e instanceof Error
            ? e.message
            : "Could not save case to admin-api.",
        );
        return;
      } finally {
        setPersisting(false);
      }
    }

    onSave(record);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-h-[90vh] max-w-4xl overflow-y-auto border border-zinc-800 bg-zinc-900 p-0"
    >
      <DndProvider backend={HTML5Backend}>
        <div className="p-6 pt-14 sm:p-8">
          <h2 className="text-xl font-semibold text-zinc-100">
            {editing ? "Edit case" : "Create case"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create from here POSTs to admin-api (unique slug + pets on every
            reward). Editing a list case PATCHes the database, then syncs local
            mock. Without API, use mock-only flows.
          </p>
          {persistError ? (
            <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {persistError}
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <CaseInputField
                id="case-name"
                label="Case name"
                value={name}
                onChange={setName}
              />
              {!editing && createCase ? (
                <>
                  <CaseInputField
                    id="case-slug"
                    label="Slug (unique URL key)"
                    value={slug}
                    onChange={setSlug}
                    hint="Lowercase, e.g. neon-starter. Stored unique in DB."
                  />
                  <CaseSelect
                    id="case-variant-tier"
                    label="Case tier (variant)"
                    value={caseVariant}
                    onChange={(v) =>
                      setCaseVariant(v as CaseVariantPayload)
                    }
                    options={[...CASE_VARIANT_OPTIONS]}
                  />
                </>
              ) : null}
              <CaseInputField
                id="case-price"
                label="Price"
                type="number"
                value={price}
                onChange={setPrice}
                error={
                  !priceOk && price !== ""
                    ? "Price must be greater than 0"
                    : undefined
                }
                step="0.01"
                min="0.01"
              />
              <div>
                <label
                  htmlFor="case-desc"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Description
                </label>
                <textarea
                  id="case-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500/60 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
              <CaseToggleSwitch
                label="Case active"
                checked={status === "active"}
                onChange={(on) => setStatus(on ? "active" : "disabled")}
              />
            </div>
            <div className="space-y-4">
              <ImageUploader
                inputId="case-image-upload"
                displayLabel={
                  coverFile?.name ??
                  (editing ? editing.imageUrl : null)
                }
                onFileChange={setCoverFile}
              />
              {coverPreviewSrc ? (
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40">
                  <p className="border-b border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400">
                    Cover preview
                  </p>
                  <div className="flex justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreviewSrc}
                      alt=""
                      className="max-h-48 max-w-full rounded-lg object-contain shadow-lg shadow-black/40"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-10 border-t border-zinc-800 pt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Rewards / items
                </h3>
                <p className="text-xs text-zinc-500">
                  Drop chances must sum to 100%. Drag rows to reorder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setItems((p) => [...p, newItem()])}
                className="rounded-xl border border-violet-600/50 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-600/30"
              >
                Add item
              </button>
            </div>

            <div
              className={cn(
                "mt-4 rounded-xl border px-4 py-3 text-sm",
                chanceOk
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              )}
            >
              Total drop chance:{" "}
              <span className="font-mono font-semibold">
                {totalChance.toFixed(1)}%
              </span>
              {chanceOk ? " ✓" : " — adjust items to reach 100%."}
            </div>

            <div className="mt-4 space-y-3">
              {items.map((it, idx) => (
                <RewardRow
                  key={it.id}
                  item={it}
                  index={idx}
                  onChange={(next) =>
                    setItems((p) => p.map((x) => (x.id === it.id ? next : x)))
                  }
                  onRemove={() =>
                    setItems((p) => p.filter((x) => x.id !== it.id))
                  }
                  onMove={move}
                />
              ))}
            </div>
          </div>

          {errors.length > 0 ? (
            <ul className="mt-4 list-inside list-disc text-sm text-rose-400">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={errors.length > 0 || persisting}
              onClick={() => void handleSave()}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {persisting ? "Saving…" : "Save case"}
            </button>
          </div>
        </div>
      </DndProvider>
    </Modal>
  );
}
