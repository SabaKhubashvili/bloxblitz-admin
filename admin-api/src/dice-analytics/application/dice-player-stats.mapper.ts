import type { DicePlayerAggregateDbRow } from '../domain/dice-analytics.repository.port';
import type { DicePlayerStatsDto } from '../presentation/dto/dice-players.response.dto';

export function toDicePlayerStatsDto(row: DicePlayerAggregateDbRow): DicePlayerStatsDto {
  const rolls = row.rolls;
  const wins = row.wins;
  const winRate =
    rolls > 0 ? Math.round(((wins * 1000) / rolls)) / 10 : 0;

  const st = row.moderationStatus;
  const status: DicePlayerStatsDto['status'] =
    st === 'BANNED' ? 'banned' : st === 'LIMITED' ? 'limited' : 'active';

  const maxBet =
    st === 'LIMITED' &&
    row.moderationMaxBet != null &&
    row.moderationMaxBet > 0
      ? roundMoney(row.moderationMaxBet)
      : null;

  return {
    username: row.username,
    rolls,
    wagered: roundMoney(row.wagered),
    winRate,
    profitLoss: roundMoney(row.profitLoss),
    risk: classifyDicePlayerRisk(row.avgChance, row.betMean, row.betStddev),
    status,
    maxBet,
  };
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function classifyDicePlayerRisk(
  avgChance: number,
  betMean: number,
  betStddev: number | null,
): 'low' | 'medium' | 'high' {
  const mean = Math.max(0, betMean);
  const std =
    betStddev != null && Number.isFinite(betStddev)
      ? Math.max(0, betStddev)
      : 0;
  const cv = mean > 0 ? std / mean : 0;

  let tier: 'low' | 'medium' | 'high' = 'medium';
  if (avgChance >= 50) tier = 'low';
  else if (avgChance < 30) tier = 'high';
  else tier = 'medium';

  if (cv >= 3) return 'high';
  if (cv >= 2) {
    if (tier === 'low') return 'medium';
    return 'high';
  }
  if (cv >= 1.25 && tier === 'low') return 'medium';
  return tier;
}
