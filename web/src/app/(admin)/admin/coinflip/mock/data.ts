import type {
  ActiveCoinflipGame,
  CoinflipConfig,
  CoinflipDisputeRow,
  CoinflipHistoryRow,
  CoinflipOverviewStats,
  CoinflipRiskLimits,
  PlayerCoinflipStat,
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

export async function fetchCoinflipOverview(
  range: TimeRange,
  activeCount: number,
  historyCount: number
): Promise<CoinflipOverviewStats> {
  await mockDelay(600);
  const m = RANGE_M[range];
  const baseGames = historyCount + Math.round(420 * m);
  const wagered = Math.round(48_200 * m * (0.9 + Math.random() * 0.2));
  const profit = Math.round(wagered * 0.035 * (0.85 + Math.random() * 0.3));
  return {
    totalGames: baseGames,
    totalWagered: wagered,
    platformProfit: profit,
    activeGamesCount: activeCount,
  };
}

export function buildGamesSeries(
  points = 24
): { x: string; y: number }[] {
  return Array.from({ length: points }, (_, i) => ({
    x: `${i + 1}h`,
    y: Math.round(15 + Math.random() * 95 + Math.sin(i / 2) * 20),
  }));
}

export function buildWagerSeries(
  points = 24
): { x: string; y: number }[] {
  let acc = 800;
  return Array.from({ length: points }, (_, i) => {
    acc += Math.round((Math.random() - 0.3) * 1200);
    return { x: `${i + 1}h`, y: Math.max(0, acc) };
  });
}

export function buildActivitySeries(
  points = 24
): { x: string; y: number }[] {
  return Array.from({ length: points }, (_, i) => ({
    x: `${i + 1}h`,
    y: Math.round(25 + Math.random() * 70 + Math.cos(i / 3) * 15),
  }));
}

export const DEFAULT_CONFIG: CoinflipConfig = {
  minBet: 0.5,
  maxBet: 5000,
  platformFeePercent: 3.5,
  maxActiveGames: 500,
  matchTimeoutMinutes: 5,
  coinflipEnabled: true,
  publicGamesEnabled: true,
  privateGamesEnabled: true,
};

export const DEFAULT_RISK: CoinflipRiskLimits = {
  maxWagerPerUser: 2500,
  maxDailyWagerPerUser: 25_000,
  maxPotSize: 10_000,
  maxConcurrentGamesPerUser: 3,
  autoCancelSuspicious: true,
  antiAbuseEnabled: true,
};

export const INITIAL_ACTIVE: ActiveCoinflipGame[] = [
  {
    id: "cf-a1",
    player1: { username: "orbitFlip", wager: 120, side: "heads" },
    player2: { username: "silentEdge", wager: 120, side: "tails" },
    status: "active",
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "cf-a2",
    player1: { username: "goldRush", wager: 2500, side: "tails" },
    player2: null,
    status: "waiting",
    createdAt: new Date(Date.now() - 45_000).toISOString(),
  },
  {
    id: "cf-a3",
    player1: { username: "neoCoin", wager: 45, side: "heads" },
    player2: { username: "deltaWins", wager: 45, side: "tails" },
    status: "active",
    createdAt: new Date(Date.now() - 300_000).toISOString(),
  },
];

export const INITIAL_HISTORY: CoinflipHistoryRow[] = Array.from(
  { length: 35 },
  (_, i) => {
    const p1 = ["orbitFlip", "goldRush", "neoCoin", "apexBet"][i % 4];
    const p2 = ["silentEdge", "deltaWins", "ghostStake", "turboMint"][
      (i + 1) % 4
    ];
    const pot = Math.round(20 + Math.random() * 1800);
    const fee = Math.round(pot * 0.035);
    const result: "heads" | "tails" = i % 2 === 0 ? "heads" : "tails";
    const winner = result === "heads" ? p1 : p2;
    return {
      id: `cf-h-${28400 - i}`,
      player1: p1,
      player2: p2,
      winner,
      totalPot: pot,
      platformFee: fee,
      result,
      timestamp: new Date(
        Date.now() - i * 3600_000 - Math.random() * 1800_000
      ).toISOString(),
    };
  }
);

export const INITIAL_DISPUTES: CoinflipDisputeRow[] = [
  {
    id: "dsp-1",
    gameId: "cf-h-28390",
    playersLabel: "orbitFlip vs silentEdge",
    reason: "Rapid cancel / recreate pattern",
    status: "pending",
  },
  {
    id: "dsp-2",
    gameId: "cf-h-28388",
    playersLabel: "goldRush vs deltaWins",
    reason: "Large pot deviation vs history",
    status: "pending",
  },
  {
    id: "dsp-3",
    gameId: "cf-h-28380",
    playersLabel: "neoCoin vs ghostStake",
    reason: "Manual player report",
    status: "reviewed",
  },
];

export const INITIAL_PLAYER_STATS: PlayerCoinflipStat[] = [
  {
    id: "u1",
    username: "orbitFlip",
    gamesPlayed: 842,
    totalWagered: 42_100,
    wins: 401,
    losses: 441,
    profitLoss: -2100,
  },
  {
    id: "u2",
    username: "goldRush",
    gamesPlayed: 1204,
    totalWagered: 128_400,
    wins: 612,
    losses: 592,
    profitLoss: 8400,
  },
  {
    id: "u3",
    username: "silentEdge",
    gamesPlayed: 310,
    totalWagered: 15_600,
    wins: 148,
    losses: 162,
    profitLoss: -800,
  },
  {
    id: "u4",
    username: "deltaWins",
    gamesPlayed: 520,
    totalWagered: 48_200,
    wins: 270,
    losses: 250,
    profitLoss: 3200,
  },
];

export function mockResolvedFromActive(
  g: ActiveCoinflipGame,
  feePercent: number
): CoinflipHistoryRow {
  const p2 = g.player2!;
  const result: "heads" | "tails" = Math.random() > 0.5 ? "heads" : "tails";
  const winner =
    result === g.player1.side ? g.player1.username : p2.username;
  const totalPot = g.player1.wager + p2.wager;
  const platformFee = Math.round(totalPot * (feePercent / 100));
  return {
    id: `cf-h-${Date.now()}`,
    player1: g.player1.username,
    player2: p2.username,
    winner,
    totalPot,
    platformFee,
    result,
    timestamp: new Date().toISOString(),
  };
}
