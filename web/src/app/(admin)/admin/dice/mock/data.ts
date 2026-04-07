import type {
  DiceGameConfig,
  DiceHistoryRow,
  DiceLiveRoll,
  DiceOverviewStats,
  DicePlayerStat,
  DiceRiskLimits,
  DiceSide,
  TimeRange,
} from "./types";

export async function mockDelay(ms = 500): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

const RANGE_M: Record<TimeRange, number> = {
  "24h": 1,
  "7d": 6.2,
  "30d": 24,
};

export async function fetchDiceOverview(
  range: TimeRange,
  liveCount: number,
  historyLen: number
): Promise<DiceOverviewStats> {
  await mockDelay(580);
  const m = RANGE_M[range];
  const rolls = Math.round((historyLen + 220) * m * (0.92 + Math.random() * 0.18));
  const wagered = Math.round(78_000 * m * (0.9 + Math.random() * 0.2));
  const pl = Math.round(wagered * 0.038 * (0.75 + Math.random() * 0.4));
  const players = Math.round(280 * Math.min(m, 5) * (0.88 + Math.random() * 0.22));
  return {
    totalRolls: rolls,
    totalWagered: wagered,
    totalProfitLoss: pl,
    activePlayers: players + liveCount * 3,
  };
}

/** 20 buckets: 0–4.99 … 95–100 */
export function buildRollDistributionBuckets(): { label: string; count: number }[] {
  const buckets = Array.from({ length: 20 }, (_, i) => ({
    label: `${i * 5}–${i * 5 + 5}`,
    count: 0,
  }));
  for (let i = 0; i < 5000; i++) {
    const v = Math.floor((Math.random() ** 0.85) * 100);
    const b = Math.min(19, Math.floor(v / 5));
    buckets[b].count += 1;
  }
  return buckets;
}

export function buildPlOverTime(points = 24): { x: string; y: number }[] {
  let acc = 1200;
  return Array.from({ length: points }, (_, i) => {
    acc += Math.round((Math.random() - 0.44) * 650);
    return { x: `${i + 1}h`, y: acc };
  });
}

export function buildBetSizeDistribution(): { label: string; y: number }[] {
  return [
    { label: "$0–25", y: Math.round(120 + Math.random() * 40) },
    { label: "$25–100", y: Math.round(200 + Math.random() * 55) },
    { label: "$100–500", y: Math.round(160 + Math.random() * 45) },
    { label: "$500–2k", y: Math.round(70 + Math.random() * 30) },
    { label: "$2k+", y: Math.round(18 + Math.random() * 14) },
  ];
}

export function buildHeatmap10x10(): number[][] {
  const g: number[][] = [];
  for (let r = 0; r < 10; r++) {
    const row: number[] = [];
    for (let c = 0; c < 10; c++) {
      const center = Math.abs(r - 4.5) + Math.abs(c - 4.5);
      const base = Math.max(0, 80 - center * 12);
      row.push(Math.round(base + Math.random() * 45));
    }
    g.push(row);
  }
  return g;
}

export function buildTargetRangeStats(): { range: string; pct: number }[] {
  return [
    { range: "0–25", pct: 8 },
    { range: "25–50", pct: 22 },
    { range: "50–75", pct: 38 },
    { range: "75–100", pct: 32 },
  ];
}

export const DEFAULT_DICE_CONFIG: DiceGameConfig = {
  minBet: 0.1,
  maxBet: 5000,
  minRoll: 0.01,
  maxRoll: 99.99,
  houseEdgePercent: 2.5,
  rtpTarget: 97.5,
  maxPayoutMultiplier: 9900,
};

export const DEFAULT_DICE_RISK: DiceRiskLimits = {
  maxWagerPerUser: 25_000,
  maxProfitPerUser: 50_000,
  maxLossPerUser: 15_000,
  maxPayoutPerRoll: 100_000,
  autoStopLargeLosses: true,
  cooldownAfterBigWins: true,
};

const USERS = [
  "diceWhale",
  "luckySeven",
  "edgeHunter",
  "rollBot99",
  "highRoller_X",
  "underDog",
  "overClock",
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function mockMultiplier(side: DiceSide, target: number, edge: number) {
  const p = side === "over" ? (100 - target) / 100 : target / 100;
  if (p <= 0) return 1;
  const raw = (1 / p) * (1 - edge / 100);
  return Math.min(9900, Math.max(1.01, round2(raw)));
}

export function generateDiceHistory(count = 48): DiceHistoryRow[] {
  const rows: DiceHistoryRow[] = [];
  const now = Date.now();
  const edge = DEFAULT_DICE_CONFIG.houseEdgePercent;
  for (let i = 0; i < count; i++) {
    const side: DiceSide = Math.random() > 0.52 ? "over" : "under";
    const target = round2(5 + Math.random() * 90);
    const rollResult = round2(Math.random() * 100);
    const won =
      side === "over" ? rollResult > target : rollResult < target;
    const mult = mockMultiplier(side, target, edge);
    const bet = round2(2 + Math.random() * 480 * (1 + (i % 5) * 0.2));
    const profitLoss = won ? round2(bet * mult - bet) : round2(-bet);
    rows.push({
      id: `dc-${881200 - i}`,
      username: `${USERS[i % USERS.length]}${i > 6 ? Math.floor(i / 3) : ""}`,
      betAmount: bet,
      side,
      targetValue: target,
      rollResult,
      multiplier: won ? mult : 0,
      profitLoss,
      timestamp: new Date(now - i * 88_000 - Math.random() * 30_000).toISOString(),
    });
  }
  return rows;
}

export const INITIAL_DICE_HISTORY = generateDiceHistory(52);

export function randomHistoryRow(): DiceHistoryRow {
  const row = generateDiceHistory(1)[0];
  return {
    ...row,
    id: `dc-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    timestamp: new Date().toISOString(),
  };
}

export const INITIAL_DICE_PLAYERS: DicePlayerStat[] = [
  {
    id: "dp1",
    username: "diceWhale",
    totalRolls: 8420,
    totalWagered: 412_000,
    winRate: 0.481,
    profitLoss: -18_400,
    riskProfile: "high",
  },
  {
    id: "dp2",
    username: "luckySeven",
    totalRolls: 2104,
    totalWagered: 52_100,
    winRate: 0.512,
    profitLoss: 2400,
    riskProfile: "medium",
  },
  {
    id: "dp3",
    username: "edgeHunter",
    totalRolls: 12_800,
    totalWagered: 198_000,
    winRate: 0.468,
    profitLoss: -9200,
    riskProfile: "high",
  },
  {
    id: "dp4",
    username: "rollBot99",
    totalRolls: 440,
    totalWagered: 8800,
    winRate: 0.505,
    profitLoss: 120,
    riskProfile: "low",
  },
  {
    id: "dp5",
    username: "underDog",
    totalRolls: 3200,
    totalWagered: 64_000,
    winRate: 0.493,
    profitLoss: -800,
    riskProfile: "medium",
  },
];

export function randomLiveRoll(seed: number): DiceLiveRoll {
  const side: DiceSide = Math.random() > 0.5 ? "over" : "under";
  const target = round2(8 + Math.random() * 84);
  return {
    id: `live-${Date.now()}-${seed}`,
    username: USERS[Math.floor(Math.abs(seed) % USERS.length)],
    bet: round2(10 + Math.random() * 900),
    side,
    target,
    result: null,
    multiplier: 0,
    won: null,
    startedAt: Date.now(),
  };
}

export function settleRoll(
  r: DiceLiveRoll,
  forcedResult?: number
): DiceLiveRoll {
  const edge = DEFAULT_DICE_CONFIG.houseEdgePercent;
  const result =
    forcedResult !== undefined
      ? round2(forcedResult)
      : round2(Math.random() * 100);
  const won =
    r.side === "over" ? result > r.target : result < r.target;
  const mult = won ? mockMultiplier(r.side, r.target, edge) : 0;
  return {
    ...r,
    result,
    won,
    multiplier: mult,
  };
}

export function tickDiceLiveRolls(rolls: DiceLiveRoll[]): DiceLiveRoll[] {
  const idx = rolls.findIndex((x) => x.won === null);
  if (idx >= 0) {
    return rolls.map((x, i) => (i === idx ? settleRoll(x) : x));
  }
  if (rolls.length < 10 && Math.random() > 0.3) {
    return [randomLiveRoll(Date.now()), ...rolls];
  }
  return rolls;
}

export function INITIAL_LIVE_ROLLS(): DiceLiveRoll[] {
  return [
    randomLiveRoll(901),
    randomLiveRoll(902),
    settleRoll(randomLiveRoll(903)),
    settleRoll(randomLiveRoll(904)),
    settleRoll(randomLiveRoll(905)),
  ];
}
