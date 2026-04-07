import type { PetValueColumnRow } from "@/lib/case-item-pet-value";

export type TimeRange = "24h" | "7d" | "30d";

export type CaseStatus = "active" | "disabled";

export type ItemRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export interface CaseRewardItem {
  /** `case_items.id` when from API */
  id: string;
  /** `pets.id` — name, image, rarity, and value rules come from this pet */
  petId: number | null;
  name: string;
  imageUrl: string | null;
  value: number;
  dropChance: number;
  /** Derived from pet in DB; not user-editable when `petId` is set */
  rarity: ItemRarity;
  /** Subset of M, N, F, R — matches `case_items.variant` in admin-api. */
  variant: string[];
  /** Value columns from `pets`; used to recompute `value` when variant changes */
  petValues?: PetValueColumnRow | null;
}

export interface CaseRecord {
  id: string;
  /** From API (`cases.slug`); mock-only rows may omit. */
  slug?: string;
  name: string;
  imageUrl: string | null;
  price: number;
  description: string;
  status: CaseStatus;
  createdAt: string;
  totalOpened: number;
  items: CaseRewardItem[];
}

export interface CasesOverviewStats {
  range: TimeRange;
  totalCases: number;
  activeCases: number;
  totalOpened: number;
  totalRevenue: number;
}

export interface CaseLimitsState {
  maxOpensPerUserDay: number;
  maxTotalOpensGlobal: number;
  cooldownSeconds: number;
  limitsEnabled: boolean;
  cooldownEnabled: boolean;
}

export interface CaseActivityRow {
  id: string;
  username: string;
  caseName: string;
  itemWon: string;
  itemValue: number;
  timestamp: string;
}

export interface CaseAnalyticsSnapshot {
  totalOpened: number;
  totalRevenue: number;
  rtpPercent: number;
  mostWonItems: { name: string; count: number }[];
}
