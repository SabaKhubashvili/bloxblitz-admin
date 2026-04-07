import type { ItemRarity } from "../mock/types";

export const RARITY_RING: Record<ItemRarity, string> = {
  common: "ring-zinc-600 border-zinc-600",
  uncommon: "ring-emerald-600/70 border-emerald-600/50",
  rare: "ring-sky-500/80 border-sky-500/50",
  epic: "ring-violet-500/80 border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.25)]",
  legendary:
    "ring-amber-400/90 border-amber-400/60 shadow-[0_0_24px_rgba(251,191,36,0.35)]",
};

export const RARITY_LABEL: Record<ItemRarity, string> = {
  common: "bg-zinc-800 text-zinc-300",
  uncommon: "bg-emerald-500/15 text-emerald-400",
  rare: "bg-sky-500/15 text-sky-300",
  epic: "bg-violet-500/15 text-violet-300",
  legendary: "bg-amber-500/15 text-amber-300",
};

export const RARITY_OPTIONS: { value: ItemRarity; label: string }[] = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
];
