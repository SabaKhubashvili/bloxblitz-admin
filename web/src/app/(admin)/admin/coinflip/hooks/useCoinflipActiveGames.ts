"use client";

import {
  fetchCoinflipActiveGames,
  type CoinflipActiveGame,
} from "@/lib/admin-api/coinflip-active-games";
import { useQuery } from "@tanstack/react-query";

export const COINFLIP_ACTIVE_GAMES_QUERY_KEY = ["coinflip", "active-games"] as const;

const POLL_MS = 4_000;

export function useCoinflipActiveGames() {
  return useQuery({
    queryKey: COINFLIP_ACTIVE_GAMES_QUERY_KEY,
    queryFn: ({ signal }) => fetchCoinflipActiveGames({ signal }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/** Maps API shape to `ActiveGameCard` mock type (heads/tails + waiting/active). */
export function activeGameToCardModel(g: CoinflipActiveGame) {
  return {
    id: g.id,
    player1: {
      username: g.player1.username,
      wager: g.player1.wager,
      side: g.player1.side === "H" ? ("heads" as const) : ("tails" as const),
    },
    player2: g.player2
      ? {
          username: g.player2.username,
          wager: g.player2.wager,
          side: g.player2.side === "H" ? ("heads" as const) : ("tails" as const),
        }
      : null,
    status: (g.state === "waiting" ? "waiting" : "active") as
      | "waiting"
      | "active",
    createdAt: g.createdAt,
  };
}
