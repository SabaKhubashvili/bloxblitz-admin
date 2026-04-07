import type {
  CaseActivityRow,
  CaseAnalyticsSnapshot,
  CaseRecord,
  CasesOverviewStats,
  TimeRange,
} from "./types";

export async function mockDelay(ms = 500): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

const RANGE_M: Record<TimeRange, number> = {
  "24h": 1,
  "7d": 6.5,
  "30d": 26,
};

export async function fetchCasesOverview(
  range: TimeRange,
  cases: CaseRecord[]
): Promise<CasesOverviewStats> {
  await mockDelay(650);
  const m = RANGE_M[range];
  const active = cases.filter((c) => c.status === "active").length;
  const opened = Math.round(
    cases.reduce((s, c) => s + c.totalOpened, 0) * m * (0.85 + Math.random() * 0.25)
  );
  const revenue = Math.round(
    cases.reduce((s, c) => s + c.price * c.totalOpened, 0) * m * (0.9 + Math.random() * 0.2)
  );
  return {
    range,
    totalCases: cases.length,
    activeCases: active,
    totalOpened: opened,
    totalRevenue: revenue,
  };
}

export function buildOpeningsSeries(
  points = 24
): { x: string; y: number }[] {
  return Array.from({ length: points }, (_, i) => ({
    x: `${i + 1}h`,
    y: Math.round(30 + Math.random() * 220 + Math.sin(i / 2.5) * 45),
  }));
}

export function buildRevenueSeries(
  points = 24
): { x: string; y: number }[] {
  let acc = 1200;
  return Array.from({ length: points }, (_, i) => {
    acc += Math.round((Math.random() - 0.35) * 800);
    return { x: `${i + 1}h`, y: Math.max(0, acc) };
  });
}

/** Snapshot used before context hydrates; replaced by INITIAL_CASES in context */
const MOCK_CASES_SEED: CaseRecord[] = [
  {
    id: "case-starter",
    name: "Starter Crate",
    imageUrl: null,
    price: 0.99,
    description: "Entry loot box with balanced odds.",
    status: "active",
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    totalOpened: 12_400,
    items: [
      {
        id: "i1",
        petId: null,
        name: "Credits x10",
        imageUrl: null,
        value: 0.5,
        dropChance: 45,
        rarity: "common",
        variant: [],
        petValues: null,
      },
      {
        id: "i2",
        petId: null,
        name: "Credits x50",
        imageUrl: null,
        value: 2.5,
        dropChance: 30,
        rarity: "uncommon",
        variant: [],
        petValues: null,
      },
      {
        id: "i3",
        petId: null,
        name: "Skin Shard",
        imageUrl: null,
        value: 8,
        dropChance: 15,
        rarity: "rare",
        variant: [],
        petValues: null,
      },
      {
        id: "i4",
        petId: null,
        name: "Neon Wrap",
        imageUrl: null,
        value: 35,
        dropChance: 8,
        rarity: "epic",
        variant: [],
        petValues: null,
      },
      {
        id: "i5",
        petId: null,
        name: "Golden Ticket",
        imageUrl: null,
        value: 120,
        dropChance: 2,
        rarity: "legendary",
        variant: [],
        petValues: null,
      },
    ],
  },
  {
    id: "case-pro",
    name: "Pro Vault",
    imageUrl: null,
    price: 4.99,
    description: "Higher stakes, better top-end.",
    status: "active",
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    totalOpened: 5_200,
    items: [
      {
        id: "p1",
        petId: null,
        name: "Bonus Coins",
        imageUrl: null,
        value: 2,
        dropChance: 40,
        rarity: "common",
        variant: [],
        petValues: null,
      },
      {
        id: "p2",
        petId: null,
        name: "Rare Emote",
        imageUrl: null,
        value: 12,
        dropChance: 35,
        rarity: "rare",
        variant: [],
        petValues: null,
      },
      {
        id: "p3",
        petId: null,
        name: "Mythic Frame",
        imageUrl: null,
        value: 80,
        dropChance: 25,
        rarity: "legendary",
        variant: [],
        petValues: null,
      },
    ],
  },
  {
    id: "case-vip",
    name: "VIP Roulette Box",
    imageUrl: null,
    price: 19.99,
    description: "Whale case — extreme variance.",
    status: "disabled",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    totalOpened: 890,
    items: [
      {
        id: "v1",
        petId: null,
        name: "Consolation",
        imageUrl: null,
        value: 5,
        dropChance: 70,
        rarity: "common",
        variant: [],
        petValues: null,
      },
      {
        id: "v2",
        petId: null,
        name: "Premium Bundle",
        imageUrl: null,
        value: 45,
        dropChance: 22,
        rarity: "epic",
        variant: [],
        petValues: null,
      },
      {
        id: "v3",
        petId: null,
        name: "Jackpot Token",
        imageUrl: null,
        value: 500,
        dropChance: 8,
        rarity: "legendary",
        variant: [],
        petValues: null,
      },
    ],
  },
];

export const INITIAL_CASES: CaseRecord[] = MOCK_CASES_SEED.map((c) => ({
  ...c,
  items: c.items.map((it) => ({ ...it })),
}));

export function generateActivityFromCases(
  cases: CaseRecord[],
  rows = 45
): CaseActivityRow[] {
  if (cases.length === 0) return [];
  const users = ["neoLoot", "boxHunter", "goldRush", "silentDrop", "apexCase"];
  const now = Date.now();
  return Array.from({ length: rows }, (_, i) => {
    const c = cases[i % cases.length];
    const item = c.items[i % c.items.length];
    return {
      id: `act-${i}`,
      username: `${users[i % users.length]}${i > 9 ? i : ""}`,
      caseName: c.name,
      itemWon: item.name,
      itemValue: item.value,
      timestamp: new Date(now - i * 61_000 - Math.random() * 4000).toISOString(),
    };
  });
}

export function analyticsForCase(c: CaseRecord): CaseAnalyticsSnapshot {
  const totalOpened = c.totalOpened;
  const totalRevenue = Math.round(c.price * totalOpened);
  const expected =
    c.items.reduce((s, it) => s + (it.dropChance / 100) * it.value, 0) /
    Math.max(c.price, 0.01);
  const rtpPercent = Math.min(99.9, Math.max(40, expected * 100));
  const mostWon = [...c.items]
    .map((it) => ({
      name: it.name,
      count: Math.max(0, Math.round(totalOpened * (it.dropChance / 100))),
    }))
    .sort((a, b) => b.count - a.count);
  return {
    totalOpened,
    totalRevenue,
    rtpPercent: Math.round(rtpPercent * 10) / 10,
    mostWonItems: mostWon.slice(0, 5),
  };
}

export function buildCaseOpenRateSeries(
  base: number,
  points = 20
): number[] {
  return Array.from({ length: points }, (_, i) =>
    Math.max(0, Math.round(base / 20 + Math.random() * 40 + Math.sin(i) * 12))
  );
}
