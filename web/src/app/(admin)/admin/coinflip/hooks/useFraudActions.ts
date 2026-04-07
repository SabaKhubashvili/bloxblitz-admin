"use client";

import {
  banUser,
  clearUser,
  flagUser,
  limitUser,
  type CoinflipFraudBanPayload,
  type CoinflipFraudLimitPayload,
} from "@/lib/admin-api/coinflip-fraud";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  COINFLIP_FRAUD_GAMES_KEY,
  COINFLIP_FRAUD_USERS_KEY,
  coinflipFraudProfileQueryKey,
} from "./coinflip-fraud-query-keys";
import { COINFLIP_PLAYERS_KEY } from "./coinflip-players-query-keys";
import { COINFLIP_USER_MODERATION_PREFIX } from "./coinflip-user-moderation-query-key";

/**
 * Central mutations for fraud admin actions. Invalidate related queries on success
 * so polling + manual refetch stay consistent (handles ban-while-viewing races).
 */
export function useFraudActions() {
  const qc = useQueryClient();

  const invalidateListsAndProfile = (username: string) => {
    void qc.invalidateQueries({ queryKey: COINFLIP_FRAUD_USERS_KEY });
    void qc.invalidateQueries({ queryKey: COINFLIP_FRAUD_GAMES_KEY });
    void qc.invalidateQueries({ queryKey: coinflipFraudProfileQueryKey(username) });
    void qc.invalidateQueries({ queryKey: [...COINFLIP_USER_MODERATION_PREFIX] });
    void qc.invalidateQueries({ queryKey: [...COINFLIP_PLAYERS_KEY] });
  };

  const flag = useMutation({
    mutationFn: ({ username, note }: { username: string; note: string }) =>
      flagUser(username, note),
    onSuccess: (_data, v) => invalidateListsAndProfile(v.username),
  });

  const limit = useMutation({
    mutationFn: ({
      username,
      payload,
    }: {
      username: string;
      payload: CoinflipFraudLimitPayload;
    }) => limitUser(username, payload),
    onSuccess: (_data, v) => invalidateListsAndProfile(v.username),
  });

  const ban = useMutation({
    mutationFn: ({
      username,
      payload,
    }: {
      username: string;
      payload: CoinflipFraudBanPayload;
    }) => banUser(username, payload),
    onSuccess: (_data, v) => invalidateListsAndProfile(v.username),
  });

  const clear = useMutation({
    mutationFn: ({ username }: { username: string }) => clearUser(username),
    onSuccess: (_data, v) => invalidateListsAndProfile(v.username),
  });

  const isAnyPending =
    flag.isPending || limit.isPending || ban.isPending || clear.isPending;

  return { flag, limit, ban, clear, isAnyPending };
}
