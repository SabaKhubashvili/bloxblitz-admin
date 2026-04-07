export type RaceStatus =
  | "active"
  | "paused"
  | "ended"
  | "cancelled"
  | "scheduled";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  wagered: number;
  /** Reward if rank holds (from prize table) */
  potentialReward: number;
  rank: number;
  /** Previous rank for animation (optional) */
  prevRank?: number;
}

export interface Race {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: RaceStatus;
  /** Index 0 = 1st place reward, … index 9 = 10th */
  rewards: number[];
  totalParticipants: number;
  totalWagered: number;
  /** Frozen when race ends */
  finalLeaderboard?: LeaderboardEntry[];
}

export interface RaceDraft {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  rewards: number[];
}
