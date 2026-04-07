"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRewardCaseItem,
  createRewardCase,
  deleteRewardCase,
  deleteRewardCaseItem,
  fetchRewardCase,
  fetchRewardCasesList,
  updateRewardCase,
  updateRewardCaseItem,
} from "@/lib/admin-api/reward-cases";

export const REWARD_CASES_LIST_KEY = ["admin", "reward-cases", "list"] as const;
export const rewardCaseDetailKey = (id: string) =>
  ["admin", "reward-cases", "detail", id] as const;

const LIST_STALE_MS = 30_000;
const DETAIL_STALE_MS = 30_000;

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function useRewardCasesList(params: {
  page: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "active" | "inactive";
  sort?: "position" | "title" | "slug" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: [...REWARD_CASES_LIST_KEY, params],
    queryFn: () => fetchRewardCasesList(params),
    staleTime: LIST_STALE_MS,
    placeholderData: (prev) => prev,
  });
}

// ---------------------------------------------------------------------------
// Single case detail
// ---------------------------------------------------------------------------

export function useRewardCase(id: string | null) {
  return useQuery({
    queryKey: rewardCaseDetailKey(id ?? ""),
    queryFn: () => fetchRewardCase(id!),
    staleTime: DETAIL_STALE_MS,
    enabled: id != null && id !== "",
  });
}

// ---------------------------------------------------------------------------
// Mutations — case-level
// ---------------------------------------------------------------------------

export function useCreateRewardCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createRewardCase(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REWARD_CASES_LIST_KEY });
    },
  });
}

export function useUpdateRewardCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => updateRewardCase(id, body),
    onSuccess: (updated) => {
      qc.setQueryData(rewardCaseDetailKey(updated.id), updated);
      void qc.invalidateQueries({ queryKey: REWARD_CASES_LIST_KEY });
    },
  });
}

export function useDeleteRewardCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRewardCase(id),
    onSuccess: (_result, id) => {
      qc.removeQueries({ queryKey: rewardCaseDetailKey(id) });
      void qc.invalidateQueries({ queryKey: REWARD_CASES_LIST_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — pool items
// ---------------------------------------------------------------------------

export function useAddRewardCaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      body,
    }: {
      caseId: string;
      body: {
        petId: number;
        weight: number;
        sortOrder?: number;
        variant?: string[];
      };
    }) => addRewardCaseItem(caseId, body),
    onSuccess: (_result, { caseId }) => {
      void qc.invalidateQueries({ queryKey: rewardCaseDetailKey(caseId) });
      void qc.invalidateQueries({ queryKey: REWARD_CASES_LIST_KEY });
    },
  });
}

export function useUpdateRewardCaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      itemId,
      body,
    }: {
      caseId: string;
      itemId: string;
      body: Record<string, unknown>;
    }) => updateRewardCaseItem(caseId, itemId, body),
    onSuccess: (_result, { caseId }) => {
      void qc.invalidateQueries({ queryKey: rewardCaseDetailKey(caseId) });
      void qc.invalidateQueries({ queryKey: REWARD_CASES_LIST_KEY });
    },
  });
}

export function useDeleteRewardCaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, itemId }: { caseId: string; itemId: string }) =>
      deleteRewardCaseItem(caseId, itemId),
    onSuccess: (_result, { caseId }) => {
      void qc.invalidateQueries({ queryKey: rewardCaseDetailKey(caseId) });
      void qc.invalidateQueries({ queryKey: REWARD_CASES_LIST_KEY });
    },
  });
}
