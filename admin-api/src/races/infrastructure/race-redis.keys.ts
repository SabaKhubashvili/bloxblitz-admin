export const RaceRedisKeys = {
  leaderboard: (raceId: string) => `race:${raceId}:leaderboard`,
} as const;
