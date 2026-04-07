import type {
  CrashGameConfig,
  CrashRoundRow,
  LiveStatsSnapshot,
  OverviewStats,
  PlayerRow,
  RiskLimits,
  TimeRange,
} from "./types";

/** Replace with `fetch('/api/admin/crash/...')` later */
export async function mockDelay(ms = 500): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

const RANGE_MULTIPLIER: Record<TimeRange, number> = {
  "24h": 1,
  "7d": 6.2,
  "30d": 24,
};

export async function fetchOverviewStats(
  range: TimeRange
): Promise<OverviewStats> {
  await mockDelay(700);
  const m = RANGE_MULTIPLIER[range];
  return {
    totalWagered: Math.round(428_391 * m * (0.95 + Math.random() * 0.1)),
    totalProfitLoss: Math.round(18_420 * m * (0.9 + Math.random() * 0.2)),
    activePlayers: Math.round(842 * Math.min(m, 4) * (0.85 + Math.random() * 0.3)),
    totalBetsCount: Math.round(12_940 * m * (0.92 + Math.random() * 0.15)),
  };
}

export function buildMultiplierSeries(count = 80): { x: string; y: number }[] {
  const out: { x: string; y: number }[] = [];
  let last = 1.2;
  for (let i = 0; i < count; i++) {
    last = Math.max(
      1.01,
      Math.min(
        89.5,
        last + (Math.random() - 0.48) * 3.2 + (Math.random() > 0.92 ? -last * 0.4 : 0)
      )
    );
    out.push({ x: `#${count - i}`, y: Math.round(last * 100) / 100 });
  }
  return out.reverse();
}

export function buildProfitLossSeries(
  points = 24
): { x: string; y: number }[] {
  const out: { x: string; y: number }[] = [];
  let acc = 1200;
  for (let i = 0; i < points; i++) {
    acc += (Math.random() - 0.42) * 420;
    out.push({
      x: `${i + 1}h`,
      y: Math.round(acc),
    });
  }
  return out;
}

export function buildActivitySeries(
  points = 24
): { x: string; y: number }[] {
  return Array.from({ length: points }, (_, i) => ({
    x: `${i + 1}h`,
    y: Math.round(40 + Math.random() * 180 + Math.sin(i / 3) * 35),
  }));
}

const NAMES = [
  "neoCrash",
  "LuckyViper",
  "silentEdge",
  "orbitBet",
  "crimsonFold",
  "deltaWins",
  "ghostStake",
  "novaFlip",
  "apexRoller",
  "voidHunter",
  "cryptoMoth",
  "silverLine",
  "turboMint",
  "iceShard",
  "emberRun",
];

export function generatePlayers(count = 32): PlayerRow[] {
  const statuses: PlayerRow["status"][] = ["active", "active", "active", "limited", "banned"];
  return Array.from({ length: count }, (_, i) => {
    const wagered = Math.round(500 + Math.random() * 85_000);
    const pl = Math.round((Math.random() - 0.55) * wagered * 0.4);
    return {
      id: `p-${i + 1}`,
      username: `${NAMES[i % NAMES.length]}${i > 14 ? i : ""}`,
      totalWagered: wagered,
      profitLoss: pl,
      betsCount: Math.round(12 + Math.random() * 900),
      status: statuses[i % statuses.length],
    };
  });
}

export function generateRoundHistory(count = 50): CrashRoundRow[] {
  const rows: CrashRoundRow[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const crashMultiplier =
      Math.round((1.01 + Math.random() ** 2 * 18 + (Math.random() > 0.97 ? 40 : 0)) * 100) /
      100;
    const totalBets = Math.round(800 + Math.random() * 42_000);
    const totalPayout = Math.round(totalBets * (0.4 + Math.random() * 0.45));
    const profitLoss = Math.round(totalBets - totalPayout);
    rows.push({
      id: `CR-${2849200 - i}`,
      crashMultiplier,
      totalBets,
      totalPayout,
      profitLoss,
      timestamp: new Date(now - i * 42_000 - Math.random() * 8000).toISOString(),
      largestBet: Math.round(50 + Math.random() * 2000),
      uniquePlayers: Math.round(8 + Math.random() * 120),
      provablyFairHash: `0x${(Math.random().toString(16) + "0".repeat(64)).slice(2, 66)}`,
    });
  }
  return rows;
}

export const DEFAULT_CONFIG: CrashGameConfig = {
  minBet: 0.1,
  maxBet: 5000,
  minCashout: 1.01,
  maxMultiplierCap: 100,
  houseEdgePercent: 4,
  gameSpeed: 1.15,
  rtpTarget: 96.5,
  volatility: "medium",
  tickRate: 20,
};

export const DEFAULT_RISK: RiskLimits = {
  maxTotalPayoutPerRound: 250_000,
  maxProfitPerUser: 50_000,
  maxLossPerUser: 25_000,
  maxConcurrentBets: 12_000,
  autoStopEnabled: true,
  cooldownEnabled: false,
};

export function initialLiveStats(): LiveStatsSnapshot {
  return {
    multiplier: 1.08,
    totalBets: 14_220,
    totalPayout: 11_890,
    profitLoss: 2330,
    activePlayers: 428,
  };
}
