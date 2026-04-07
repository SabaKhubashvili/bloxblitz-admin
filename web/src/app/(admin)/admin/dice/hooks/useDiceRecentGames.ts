"use client";

import { fetchDiceRecentGames } from "@/lib/admin-api/dice-recent-games";
import type { DiceRecentGameApi } from "@/lib/admin-api/dice-recent-games";
import type { DiceHistoryRow } from "../mock/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const DEBOUNCE_MS = 300;
const STALE_MS = 15_000;

export type DiceRecentGamesUiFilters = {
  player: string;
  minBet: string;
  side: "all" | "over" | "under";
};

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Effective payout multiplier for the roll (payout / bet). */
export function calculateDiceHistoryMultiplier(game: {
  betAmount: number;
  payout: number;
}): number {
  if (game.betAmount <= 0) return 0;
  return game.payout / game.betAmount;
}

function mapApiGameToHistoryRow(game: DiceRecentGameApi): DiceHistoryRow {
  return {
    id: game.id,
    username: game.player,
    betAmount: game.betAmount,
    targetValue: game.target,
    rollResult: game.roll,
    multiplier: calculateDiceHistoryMultiplier(game),
    profitLoss: game.profit,
    timestamp: game.createdAt,
    side: game.side,
  };
}

function buildRequestParams(filters: DiceRecentGamesUiFilters): {
  player?: string;
  minBet?: number;
  side?: "over" | "under";
} {
  const player = filters.player.trim();
  const minStr = filters.minBet.trim();
  const minNum = minStr === "" ? undefined : Number(minStr);
  const minBet =
    minNum !== undefined && !Number.isNaN(minNum) && minNum >= 0
      ? minNum
      : undefined;

  return {
    player: player || undefined,
    minBet,
    side: filters.side !== "all" ? filters.side : undefined,
  };
}

export function useDiceRecentGames(filters: DiceRecentGamesUiFilters) {
  const debouncedPlayer = useDebouncedValue(filters.player, DEBOUNCE_MS);
  const debouncedMinBet = useDebouncedValue(filters.minBet, DEBOUNCE_MS);
  const debouncedSide = useDebouncedValue(filters.side, DEBOUNCE_MS);

  const requestFilters: DiceRecentGamesUiFilters = useMemo(
    () => ({
      player: debouncedPlayer,
      minBet: debouncedMinBet,
      side: debouncedSide,
    }),
    [debouncedPlayer, debouncedMinBet, debouncedSide],
  );

  const apiParams = useMemo(
    () => buildRequestParams(requestFilters),
    [requestFilters],
  );

  const query = useQuery({
    queryKey: ["diceRecentGames", apiParams] as const,
    queryFn: ({ signal }) => fetchDiceRecentGames(apiParams, { signal }),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

  const games = useMemo(
    () => (query.data?.games ?? []).map(mapApiGameToHistoryRow),
    [query.data],
  );

  return {
    loading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    errorMessage:
      query.error instanceof Error ? query.error.message : null,
    games,
    refetch: query.refetch,
  };
}
