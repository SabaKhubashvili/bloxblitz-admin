import type { LeaderboardEntry, Race } from "./types";

const NAMES = [
  "apexRider",
  "turboNick",
  "lunaBet",
  "neoStake",
  "orbitKing",
  "flashWager",
  "novaSpin",
  "cypherPot",
  "voltVault",
  "stormPot",
  "pixelPunt",
  "echoRoll",
];

export function defaultRewards(): number[] {
  return [5000, 3000, 2000, 1200, 800, 500, 400, 300, 200, 100];
}

function totalPool(rewards: number[]) {
  return rewards.reduce((a, b) => a + b, 0);
}

export function buildLeaderboard(
  rewards: number[],
  seed: number
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  let s = seed;
  for (let i = 0; i < 12; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const wagered = Math.round(800 + (s % 5000) * 12 + (i % 4) * 900);
    entries.push({
      userId: `u-${i}-${seed}`,
      username: NAMES[i % NAMES.length] + (i > 11 ? i : ""),
      wagered,
      potentialReward: 0,
      rank: 0,
    });
  }
  entries.sort((a, b) => b.wagered - a.wagered);
  const top = entries.slice(0, 10);
  return top.map((e, idx) => ({
    ...e,
    rank: idx + 1,
    potentialReward: rewards[idx] ?? 0,
  }));
}

export function tickLeaderboard(
  entries: LeaderboardEntry[],
  rewards: number[]
): LeaderboardEntry[] {
  const copy = entries.map((e) => ({
    ...e,
    prevRank: e.rank,
    wagered: e.wagered + Math.round((Math.random() - 0.35) * 420),
  }));
  copy.sort((a, b) => b.wagered - a.wagered);
  return copy.slice(0, 10).map((e, idx) => ({
    ...e,
    rank: idx + 1,
    potentialReward: rewards[idx] ?? 0,
  }));
}

const now = Date.now();

export const MOCK_PAST_RACES: Race[] = [
  {
    id: "race-winter-sprint",
    name: "Winter Sprint",
    description: "Holiday volume race",
    startTime: new Date(now - 14 * 86400000).toISOString(),
    endTime: new Date(now - 7 * 86400000).toISOString(),
    status: "ended",
    rewards: defaultRewards(),
    totalParticipants: 842,
    totalWagered: 1_240_000,
    finalLeaderboard: buildLeaderboard(defaultRewards(), 101),
  },
  {
    id: "race-midweek-blitz",
    name: "Midweek Blitz",
    startTime: new Date(now - 5 * 86400000).toISOString(),
    endTime: new Date(now - 3 * 86400000).toISOString(),
    status: "ended",
    rewards: defaultRewards().map((x) => Math.round(x * 0.8)),
    totalParticipants: 512,
    totalWagered: 620_000,
    finalLeaderboard: buildLeaderboard(
      defaultRewards().map((x) => Math.round(x * 0.8)),
      202
    ),
  },
];

const activeRewards = defaultRewards();
export const MOCK_ACTIVE_RACE: Race = {
  id: "race-spring-thunder",
  name: "Spring Thunder",
  description: "Top 10 share the pool — ends Sunday.",
  startTime: new Date(now - 2 * 3600000).toISOString(),
  endTime: new Date(now + 44 * 3600000).toISOString(),
  status: "active",
  rewards: activeRewards,
  totalParticipants: 328,
  totalWagered: 410_000,
};

export const MOCK_SCHEDULED_RACE: Race = {
  id: "race-next-wave",
  name: "Next Wave",
  description: "Queued start after current race.",
  startTime: new Date(now + 48 * 3600000).toISOString(),
  endTime: new Date(now + 120 * 3600000).toISOString(),
  status: "scheduled",
  rewards: defaultRewards(),
  totalParticipants: 0,
  totalWagered: 0,
};

export function prizePool(r: Race) {
  return totalPool(r.rewards);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && ae > bs;
}
