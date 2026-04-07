"use client";

import {
  disableDiceBetting as postDisableDiceBetting,
  enableDiceBetting as postEnableDiceBetting,
  fetchDiceBettingStatus,
} from "@/lib/admin-api/dice-betting";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const DICE_BETTING_STATUS_QUERY_KEY = ["dice-betting-status"] as const;

const STALE_MS = 15_000;

export function useDiceBettingStatus() {
  return useQuery({
    queryKey: DICE_BETTING_STATUS_QUERY_KEY,
    queryFn: () => fetchDiceBettingStatus(),
    staleTime: STALE_MS,
  });
}

export function useDisableBetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postDisableDiceBetting(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DICE_BETTING_STATUS_QUERY_KEY });
    },
  });
}

export function useEnableBetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postEnableDiceBetting(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: DICE_BETTING_STATUS_QUERY_KEY });
    },
  });
}
