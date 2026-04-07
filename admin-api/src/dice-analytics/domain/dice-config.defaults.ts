export const DICE_CONFIG_REDIS_KEY = 'dice:config';

export type DiceConfig = {
  minBet: number;
  maxBet: number;
  houseEdge: number;
  rtpTarget: number;
  maxPayoutMultiplier: number;
};

export const DEFAULT_DICE_CONFIG: DiceConfig = {
  minBet: 0.1,
  maxBet: 3000,
  houseEdge: 1.5,
  rtpTarget: 97,
  maxPayoutMultiplier: 1000,
};

export function cloneDiceConfig(c: DiceConfig): DiceConfig {
  return { ...c };
}
