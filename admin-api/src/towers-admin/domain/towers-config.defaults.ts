export type TowersConfigPayload = {
  minBet: number;
  maxBet: number;
  allowedDifficulties: string[];
  allowedLevels: number[];
};

/** Shared with BloxBlitz_Amp `RedisKeys.towers.adminConfig`. */
export const TOWERS_CONFIG_REDIS_KEY = 'towers:admin:config';

export const TOWERS_CONFIG_DEFAULTS: TowersConfigPayload = {
  minBet: 0.01,
  maxBet: 3000,
  allowedDifficulties: ['easy', 'medium', 'hard'],
  allowedLevels: [8, 10, 12, 16],
};
