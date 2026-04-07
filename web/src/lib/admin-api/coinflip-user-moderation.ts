import {
  getCoinflipPlayerStatus,
  type CoinflipPlayerStatusResponse,
} from "./coinflip-players";
import { getUserRiskProfile } from "./coinflip-fraud";

export type CoinflipUserModerationDetail = CoinflipPlayerStatusResponse & {
  /** From fraud risk-profile mitigation when set (fraud ban path); player-API-only bans may omit this. */
  /** Raw mitigation hash when present (for tooltips / future use). */
  fraudMitigation: Record<string, string> | null;
  /** ISO end time from fraud profile `banUntil` when present. */
  banUntilIso: string | null;
};

export async function fetchCoinflipUserModeration(
  username: string,
): Promise<CoinflipUserModerationDetail> {
  const [status, profile] = await Promise.all([
    getCoinflipPlayerStatus(username),
    getUserRiskProfile(username),
  ]);
  const m = profile.mitigation;
  const rawUntil = m?.banUntil?.trim();

  return {
    ...status,
    fraudMitigation: m,
    banUntilIso: rawUntil && rawUntil.length > 0 ? rawUntil : null,
  };
}
