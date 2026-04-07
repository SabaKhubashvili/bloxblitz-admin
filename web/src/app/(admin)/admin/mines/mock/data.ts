import type {
  MinesGameConfig,
  MinesHistoryRow,
  MinesLiveGame,
  MinesOverviewStats,
  MinesPlayerStat,
  MinesRiskLimits,
  TimeRange,
} from "./types";

export async function mockDelay(ms = 500): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

const RANGE_M: Record<TimeRange, number> = {
  "24h": 1,
  "7d": 6.3,
  "30d": 25,
};

export async function fetchMinesOverview(
  range: TimeRange,
  liveCount: number,
  historyLen: number
): Promise<MinesOverviewStats> {
  await mockDelay(620);
  const m = RANGE_M[range];
  const games = Math.round((historyLen + 180) * m * (0.9 + Math.random() * 0.2));
  const wagered = Math.round(62_000 * m * (0.88 + Math.random() * 0.2));
  const pl = Math.round(wagered * 0.042 * (0.8 + Math.random() * 0.35));
  const players = Math.round(320 * Math.min(m, 5) * (0.85 + Math.random() * 0.25));
  return {
    totalGamesPlayed: games,
    totalWagered: wagered,
    totalProfitLoss: pl,
    activePlayers: players + liveCount * 2,
    avgCashoutMultiplier: Math.round((1.4 + Math.random() * 0.8) * 100) / 100,
  };
}

export function buildGamesPlayedSeries(
  points = 24
): { x: string; y: number }[] {
  return Array.from({ length: points }, (_, i) => ({
    x: `${i + 1}h`,
    y: Math.round(40 + Math.random() * 160 + Math.sin(i / 2.2) * 28),
  }));
}

export function buildPlSeries(points = 24): { x: string; y: number }[] {
  let acc = 800;
  return Array.from({ length: points }, (_, i) => {
    acc += Math.round((Math.random() - 0.42) * 900);
    return { x: `${i + 1}h`, y: acc };
  });
}

export function buildAvgMultiplierSeries(
  points = 24
): { x: string; y: number }[] {
  return Array.from({ length: points }, (_, i) => ({
    x: `${i + 1}h`,
    y: Math.round((1.15 + Math.random() * 2.2 + Math.sin(i / 4) * 0.2) * 100) / 100,
  }));
}

export const DEFAULT_MINES_CONFIG: MinesGameConfig = {
  minBet: 0.2,
  maxBet: 2500,
  gridSize: 5,
  defaultMinesCount: 3,
  maxMinesAllowed: 24,
  houseEdgePercent: 4,
  rtpTarget: 97,
  gameSpeedMs: 420,
};

export const DEFAULT_MINES_RISK: MinesRiskLimits = {
  maxWagerPerUser: 5000,
  maxLossPerUser: 10_000,
  maxProfitPerUser: 25_000,
  maxConcurrentGames: 4,
  autoStopEnabled: true,
  cooldownAfterBigWins: false,
};

function pickMines(total: number, count: number, seed: number): number[] {
  const idx = Array.from({ length: total }, (_, i) => i);
  const out: number[] = [];
  let s = seed;
  for (let k = 0; k < count; k++) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % idx.length;
    out.push(idx[j]);
    idx.splice(j, 1);
  }
  return out.sort((a, b) => a - b);
}

export function generateHistory(count = 40): MinesHistoryRow[] {
  const rows: MinesHistoryRow[] = [];
  const users = ["mineKing", "gridWalker", "safeTap", "blastZone", "neoDig"];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const gridSize = 5;
    const total = gridSize * gridSize;
    const minesCount = 2 + (i % 6);
    const mineIndices = pickMines(total, minesCount, i * 7919);
    const safeCells = Array.from({ length: total }, (_, j) => j).filter(
      (j) => !mineIndices.includes(j)
    );
    const hitMine = Math.random() > 0.68;
    const maxSafe = safeCells.length;
    const tilesCleared = hitMine
      ? Math.max(1, Math.floor(Math.random() * (maxSafe - 1)))
      : Math.max(1, Math.floor(Math.random() * maxSafe) + 1);
    const revealedIndices = safeCells.slice(0, tilesCleared);
    const mult = hitMine
      ? 0
      : Math.round(
          (1.02 + tilesCleared * 0.07 + Math.random() * 0.35) * 100
        ) / 100;
    const bet = Math.round((5 + Math.random() * 450) * 100) / 100;
    const profitLoss = hitMine
      ? -bet
      : Math.round(bet * mult - bet);
    rows.push({
      id: `mn-${928100 - i}`,
      username: `${users[i % users.length]}${i > 8 ? i : ""}`,
      betAmount: bet,
      minesCount,
      tilesCleared,
      cashoutMultiplier: mult,
      profitLoss,
      timestamp: new Date(now - i * 95_000 - Math.random() * 20_000).toISOString(),
      gridSize,
      mineIndices,
      revealedIndices,
    });
  }
  return rows;
}

export const INITIAL_HISTORY = generateHistory(42);

export const INITIAL_PLAYER_STATS: MinesPlayerStat[] = [
  {
    id: "p1",
    username: "mineKing",
    totalGames: 2104,
    totalWins: 980,
    totalWagered: 84_200,
    avgTilesCleared: 6.2,
    profitLoss: -3200,
    moderationStatus: "ACTIVE",
    maxBetAmount: null,
    maxGamesPerHour: null,
  },
  {
    id: "p2",
    username: "gridWalker",
    totalGames: 890,
    totalWins: 420,
    totalWagered: 22_400,
    avgTilesCleared: 8.1,
    profitLoss: 4100,
    moderationStatus: "ACTIVE",
    maxBetAmount: null,
    maxGamesPerHour: null,
  },
  {
    id: "p3",
    username: "safeTap",
    totalGames: 412,
    totalWins: 190,
    totalWagered: 8_900,
    avgTilesCleared: 4.8,
    profitLoss: -400,
    moderationStatus: "ACTIVE",
    maxBetAmount: null,
    maxGamesPerHour: null,
  },
];

export function randomLiveGame(seed: number): MinesLiveGame {
  const gridSize = 5;
  const total = gridSize * gridSize;
  const minesCount = 2 + (seed % 5);
  const mineIndices = pickMines(total, minesCount, seed + 1000);
  const safeOrder = Array.from({ length: total }, (_, j) => j).filter(
    (j) => !mineIndices.includes(j)
  );
  const hitMine = seed % 9 === 0;
  const revealCount = hitMine
    ? Math.max(1, (seed % (safeOrder.length - 1)) + 1)
    : Math.min(safeOrder.length, (seed % safeOrder.length) + 2);
  const cells: (boolean | null)[] = Array(total).fill(null);
  for (let r = 0; r < revealCount && r < safeOrder.length; r++) {
    cells[safeOrder[r]] = true;
  }
  if (hitMine) {
    const blown = mineIndices.find((m) => cells[m] === null) ?? mineIndices[0];
    cells[blown] = false;
  }
  const safeRevealed = cells.filter((c) => c === true).length;
  const bet =
    Math.round((15 + (seed % 200)) * (seed % 11 === 0 ? 6 : 1) * 100) / 100;
  const mult = hitMine
    ? 0
    : Math.round((1.05 + safeRevealed * 0.065) * 100) / 100;
  const potential = Math.round(bet * mult * 100) / 100;
  return {
    id: `lv-${seed}-${Date.now() % 10000}`,
    username: `live_${(seed % 50) + 1}`,
    bet,
    minesCount,
    gridSize,
    tilesRevealed: safeRevealed + (hitMine ? 1 : 0),
    potentialPayout: potential,
    hitMine,
    mineIndices,
    cells,
  };
}

export function tickLiveGames(games: MinesLiveGame[]): MinesLiveGame[] {
  return games.map((g) => {
    if (g.hitMine) return g;
    const cells = [...g.cells];
    const hiddenSafe: number[] = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === null && !g.mineIndices.includes(i)) hiddenSafe.push(i);
    }
    if (hiddenSafe.length === 0) return { ...g, cells };
    const pick = hiddenSafe[Math.floor(Math.random() * hiddenSafe.length)];
    cells[pick] = true;
    const safeCount = cells.filter((c) => c === true).length;
    const mult =
      Math.round((1.04 + safeCount * 0.062 + Math.random() * 0.08) * 100) / 100;
    const potential = Math.round(g.bet * mult * 100) / 100;
    return {
      ...g,
      cells,
      tilesRevealed: safeCount,
      potentialPayout: potential,
    };
  });
}

export function mineCountHistogram(
  history: MinesHistoryRow[]
): { label: string; value: number }[] {
  const map = new Map<number, number>();
  history.forEach((h) => {
    map.set(h.minesCount, (map.get(h.minesCount) ?? 0) + 1);
  });
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => ({ label: `${k} mines`, value: v }));
}

export function riskDistribution(): { label: string; value: number }[] {
  return [
    { label: "Low", value: 42 },
    { label: "Medium", value: 35 },
    { label: "High", value: 23 },
  ];
}
