import type { DiceConfig } from './dice-config.defaults';

const CONFIG_KEYS: (keyof DiceConfig)[] = [
  'minBet',
  'maxBet',
  'houseEdge',
  'rtpTarget',
  'maxPayoutMultiplier',
];

/**
 * Validates a full dice config snapshot (after merge / defaults).
 */
export function validateDiceConfig(c: DiceConfig): boolean {
  const nums = [
    c.minBet,
    c.maxBet,
    c.houseEdge,
    c.rtpTarget,
    c.maxPayoutMultiplier,
  ];
  if (!nums.every(Number.isFinite)) return false;
  if (c.minBet < 0) return false;
  if (c.maxBet <= c.minBet) return false;
  if (c.houseEdge <= 0) return false;
  if (c.rtpTarget < 0 || c.rtpTarget > 100) return false;
  if (c.maxPayoutMultiplier <= 0) return false;
  return true;
}

export function diceConfigFromRedisHash(
  hash: Record<string, string>,
  defaults: DiceConfig,
): DiceConfig {
  const pick = (key: keyof DiceConfig): number => {
    const raw = hash[key];
    if (raw === undefined || raw === '') return defaults[key];
    const n = Number(raw);
    return Number.isFinite(n) ? n : defaults[key];
  };
  return {
    minBet: pick('minBet'),
    maxBet: pick('maxBet'),
    houseEdge: pick('houseEdge'),
    rtpTarget: pick('rtpTarget'),
    maxPayoutMultiplier: pick('maxPayoutMultiplier'),
  };
}

export function hashMissingAnyField(hash: Record<string, string>): boolean {
  return CONFIG_KEYS.some((k) => hash[k] === undefined || hash[k] === '');
}

export function diceConfigToRedisFields(
  c: DiceConfig,
): Record<string, string> {
  return {
    minBet: String(c.minBet),
    maxBet: String(c.maxBet),
    houseEdge: String(c.houseEdge),
    rtpTarget: String(c.rtpTarget),
    maxPayoutMultiplier: String(c.maxPayoutMultiplier),
  };
}
