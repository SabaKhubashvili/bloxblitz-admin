import { defaultRewards } from "../mock/data";
import type { LeaderboardEntry, Race } from "../mock/types";
import type {
  RaceHistoryItemApi,
  RaceOverviewActiveApi,
  RaceOverviewNextApi,
  RaceOverviewTopEntryApi,
} from "@/lib/admin-api/races";

export function raceDisplayName(id: string): string {
  if (!id) return "Race";
  return `Race ${id.slice(0, 8)}`;
}

/** Map DB/API tiers to a length-10 `Race.rewards` array (unused ranks = 0). */
export function rewardTiersToRewardsArray(
  tiers: Array<{ position: number; rewardAmount: number }>,
): number[] {
  const out = new Array<number>(10).fill(0);
  for (const t of tiers) {
    if (t.position >= 1 && t.position <= 10) {
      out[t.position - 1] = t.rewardAmount;
    }
  }
  return out;
}

/** Split prize pool across top 10 for display (same proportions as default template). */
export function poolToRewardTiers(totalPool: number): number[] {
  const template = defaultRewards();
  const sum = template.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalPool <= 0) {
    return template.map(() => 0);
  }
  const raw = template.map((w) => (w / sum) * totalPool);
  const rounded = raw.map((x) => Math.round(x * 100) / 100);
  const drift = totalPool - rounded.reduce((a, b) => a + b, 0);
  if (Math.abs(drift) >= 0.01) {
    rounded[0] = Math.round((rounded[0] + drift) * 100) / 100;
  }
  return rounded;
}

export function mapTop10ToLeaderboard(
  top10: RaceOverviewTopEntryApi[],
  rewards: number[],
): LeaderboardEntry[] {
  return top10.map((row) => ({
    userId: `lb-${row.username}-${row.rank}`,
    username: row.username,
    wagered: row.wagered,
    rank: row.rank,
    potentialReward: rewards[row.rank - 1] ?? 0,
  }));
}

export function mapActiveApiToRace(a: RaceOverviewActiveApi): Race {
  const rewards =
    a.rewardTiers?.length > 0
      ? rewardTiersToRewardsArray(a.rewardTiers)
      : poolToRewardTiers(a.prizePool);
  return {
    id: a.id,
    name: raceDisplayName(a.id),
    description: `Race window: ${a.raceWindow}`,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status === "paused" ? "paused" : "active",
    rewards,
    totalParticipants: a.participants,
    totalWagered: a.totalWagered,
  };
}

export function mapNextApiToRace(n: RaceOverviewNextApi): Race {
  const rewards =
    n.rewardTiers?.length > 0
      ? rewardTiersToRewardsArray(n.rewardTiers)
      : poolToRewardTiers(n.prizePool);
  return {
    id: n.id,
    name: raceDisplayName(n.id),
    startTime: n.startTime,
    endTime: n.endTime,
    status: "scheduled",
    rewards,
    totalParticipants: 0,
    totalWagered: 0,
  };
}

export function inferRaceWindowLabel(
  startIso: string,
  endIso: string,
): "24h" | "7d" | "custom" {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "custom";
  }
  const h = (end - start) / 3600000;
  if (Math.abs(h - 24) <= 0.25) return "24h";
  if (Math.abs(h - 168) <= 1) return "7d";
  return "custom";
}

export function mapHistoryApiToRace(h: RaceHistoryItemApi): Race {
  const rewards = poolToRewardTiers(h.prizePool);
  const finalLeaderboard: LeaderboardEntry[] = h.winners.map((w) => ({
    userId: `fin-${h.id}-${w.username}-${w.rank}`,
    username: w.username,
    wagered: w.wagered,
    rank: w.rank,
    potentialReward: rewards[w.rank - 1] ?? 0,
  }));
  return {
    id: h.id,
    name: raceDisplayName(h.id),
    startTime: h.startTime,
    endTime: h.endTime,
    status: h.status === "completed" ? "ended" : "cancelled",
    rewards,
    totalParticipants: h.participants,
    totalWagered: h.totalWagered,
    finalLeaderboard,
  };
}
