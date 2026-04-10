export type CoinflipBotConfigJson = {
  isActive: boolean;
  minBet: number;
  maxBet: number;
  joinDelayMinMs?: number;
  joinDelayMaxMs?: number;
  behaviorTier?: 0 | 1 | 2;
  selectionWeight?: number;
};

export type CoinflipBotCacheEntry = {
  userId: string;
  username: string;
  profilePicture: string;
  level: number;
  isBot: true;
  isActive: boolean;
  minBet: number;
  maxBet: number;
  joinDelayMinMs: number;
  joinDelayMaxMs: number;
  behaviorTier: 0 | 1 | 2;
  selectionWeight: number;
};

export const COINFLIP_BOT_CONFIG_DEFAULTS: CoinflipBotConfigJson = {
  isActive: true,
  minBet: 0.01,
  maxBet: 1_000_000,
  joinDelayMinMs: 200,
  joinDelayMaxMs: 1200,
  behaviorTier: 1,
  selectionWeight: 1,
};
