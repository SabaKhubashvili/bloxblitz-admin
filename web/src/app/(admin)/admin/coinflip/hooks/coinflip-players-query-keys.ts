import type { CoinflipPlayersListParams } from "@/lib/admin-api/coinflip-players";

export const COINFLIP_PLAYERS_KEY = ["coinflip", "players", "list"] as const;

export function coinflipPlayersListQueryKey(filters: CoinflipPlayersListParams) {
  return [...COINFLIP_PLAYERS_KEY, filters] as const;
}

export function coinflipPlayerHistoryQueryKey(
  username: string,
  page: number,
  limit: number,
) {
  return ["coinflip", "players", "history", username, page, limit] as const;
}
