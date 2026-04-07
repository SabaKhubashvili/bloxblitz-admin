import { adminApiAxios } from "./admin-axios";
import type { DiceAnalyticsRange } from "./dice-analytics";

export type DiceTargetRangeStat = { range: string; pct: number };

export type DiceScatterResponse = {
  low: [number, number][];
  high: [number, number][];
};

export type DiceRiskAnalyticsResponse = {
  riskCounts: { low: number; medium: number; high: number };
  winRateByStake: { low: number[]; high: number[] };
  avgWinMultiplier: number;
};

function appendPlayer(params: URLSearchParams, player?: string) {
  const trimmed = player?.trim();
  if (trimmed) params.set("player", trimmed);
}

export async function fetchDiceHeatmap(
  range: DiceAnalyticsRange,
  player?: string,
) {
  const params = new URLSearchParams({ range });
  appendPlayer(params, player);
  const { data } = await adminApiAxios.get<{ heatmap: number[][] }>(
    `admin/dice/analytics/heatmap?${params.toString()}`,
  );
  return data;
}

export async function fetchDiceTargetRanges(
  range: DiceAnalyticsRange,
  player?: string,
) {
  const params = new URLSearchParams({ range });
  appendPlayer(params, player);
  const { data } = await adminApiAxios.get<{ ranges: DiceTargetRangeStat[] }>(
    `admin/dice/analytics/target-ranges?${params.toString()}`,
  );
  return data;
}

export async function fetchDiceScatter(
  range: DiceAnalyticsRange,
  opts?: { player?: string; minBet?: number; maxBet?: number },
) {
  const params = new URLSearchParams({ range });
  appendPlayer(params, opts?.player);
  if (opts?.minBet != null && opts.minBet > 0) {
    params.set("minBet", String(opts.minBet));
  }
  if (opts?.maxBet != null && opts.maxBet > 0) {
    params.set("maxBet", String(opts.maxBet));
  }
  const { data } = await adminApiAxios.get<DiceScatterResponse>(
    `admin/dice/analytics/scatter?${params.toString()}`,
  );
  return data;
}

export async function fetchDiceRiskAnalytics(range: DiceAnalyticsRange) {
  const params = new URLSearchParams({ range });
  const { data } = await adminApiAxios.get<DiceRiskAnalyticsResponse>(
    `admin/dice/analytics/risk?${params.toString()}`,
  );
  return data;
}
