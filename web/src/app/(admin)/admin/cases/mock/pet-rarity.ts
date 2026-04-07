import type { ItemRarity } from "./types";

export function mapDbPetRarityToItemRarity(r: string): ItemRarity {
  const x = r.toLowerCase().trim();
  if (
    x === "common" ||
    x === "uncommon" ||
    x === "rare" ||
    x === "epic" ||
    x === "legendary"
  ) {
    return x;
  }
  return "common";
}
