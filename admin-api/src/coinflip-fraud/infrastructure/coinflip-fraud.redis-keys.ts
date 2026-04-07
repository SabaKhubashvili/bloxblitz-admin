/** Redis key layout for coinflip fraud detection — keep in sync with ws mitigation reads. */

export const CoinflipFraudRedisKeys = {
  stream: () =>
    process.env.COINFLIP_FRAUD_STREAM_KEY?.trim() || 'cf:fraud:stream',

  streamGroup: () => 'cf-fraud-admin',

  gameSession: (gameId: string) => `cf:fraud:sess:${gameId}`,

  processedGame: (gameId: string) => `cf:fraud:done:${gameId}`,

  userGames: (username: string) => `cf:fraud:user:${username}:games`,

  userStats: (username: string) => `cf:fraud:user:${username}:stats`,

  userOppZset: (username: string) => `cf:fraud:user:${username}:opp`,

  userJoinLat: (username: string) => `cf:fraud:user:${username}:lat:join`,

  userReadyLat: (username: string) => `cf:fraud:user:${username}:lat:ready`,

  pairStats: (a: string, b: string) => {
    const [x, y] = a < b ? [a, b] : [b, a];
    return `cf:fraud:pair:${x}:${y}`;
  },

  pairIndex: () => `cf:fraud:pairs:index`,

  ipUsers: (ipHash: string) => `cf:fraud:ip:${ipHash}`,

  fpUsers: (fp: string) => `cf:fraud:fp:${fp}`,

  flowEdge: (from: string, to: string) => `cf:fraud:flow:${from}>${to}`,

  riskUser: (username: string) => `cf:fraud:risk:user:${username}`,

  suspiciousUsers: () => `cf:fraud:suspicious:users`,

  suspiciousGames: () => `cf:fraud:suspicious:games`,

  gameRisk: (gameId: string) => `cf:fraud:game:risk:${gameId}`,

  mitigation: (username: string) => `cf:fraud:mitigation:${username}`,

  clusterMembers: (clusterId: string) => `cf:fraud:cluster:${clusterId}`,

  userClusters: (username: string) => `cf:fraud:user:${username}:clusters`,
} as const;
