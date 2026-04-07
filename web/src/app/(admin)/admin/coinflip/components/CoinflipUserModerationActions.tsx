"use client";

import { Modal } from "@/components/ui/modal";
import type { CoinflipUserModerationDetail } from "@/lib/admin-api/coinflip-user-moderation";
import { clearCoinflipPlayerModeration } from "@/lib/admin-api/coinflip-players";
import { COINFLIP_PLAYERS_KEY } from "../hooks/coinflip-players-query-keys";
import { coinflipUserModerationQueryKey } from "../hooks/coinflip-user-moderation-query-key";
import { formatBannedUntilUtc, formatRemainingBanLabel } from "../lib/format-coinflip-ban";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { FraudAdminActions } from "./FraudAdminActions";
import { cn } from "./cn";

const btnSm =
  "rounded-lg border border-zinc-600/80 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

export type CoinflipUserModerationActionsProps = {
  username: string;
  detail: CoinflipUserModerationDetail | undefined;
  isLoading: boolean;
  isError?: boolean;
  /** After clear moderation or when parent list should sync (e.g. invalidate players list). */
  onAfterMutation?: () => void;
  className?: string;
};

/**
 * Coinflip DB moderation (banned / limited) vs fraud tooling actions.
 * When user is banned or limited in `CoinflipPlayerControl`, shows clear-moderation only.
 */
export function CoinflipUserModerationActions({
  username,
  detail,
  isLoading,
  isError = false,
  onAfterMutation,
  className,
}: CoinflipUserModerationActionsProps) {
  const queryClient = useQueryClient();
  const [clearOpen, setClearOpen] = useState(false);

  const clearMutation = useMutation({
    mutationFn: () => clearCoinflipPlayerModeration(username),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: coinflipUserModerationQueryKey(username),
        }),
        queryClient.invalidateQueries({ queryKey: COINFLIP_PLAYERS_KEY }),
      ]);
      onAfterMutation?.();
      setClearOpen(false);
    },
  });

  const moderated =
    detail?.status === "banned" || detail?.status === "limited";

  const busyClear = clearMutation.isPending;

  const fraudDisabled = busyClear;

  const onOpenClear = useCallback(() => {
    if (busyClear) return;
    setClearOpen(true);
  }, [busyClear]);

  if (isLoading && !detail) {
    return (
      <div className={cn("text-[11px] text-zinc-500", className)}>
        Loading moderation…
      </div>
    );
  }

  if (isError && !detail) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p className="text-[11px] text-rose-400">
          Coinflip status unavailable — fraud tools still work.
        </p>
        <FraudAdminActions
          username={username}
          disabled={fraudDisabled}
          coinflipPlayerBanLimit
        />
      </div>
    );
  }

  if (moderated) {
    const untilLine =
      detail?.status === "banned"
        ? detail.banUntilIso
          ? `Banned until ${formatBannedUntilUtc(detail.banUntilIso)}`
          : "Banned (end time not on fraud profile — still enforced server-side)"
        : null;
    const remaining =
      detail?.banUntilIso && detail.status === "banned"
        ? formatRemainingBanLabel(detail.banUntilIso)
        : null;

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div
          className="max-w-[220px] rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-[11px] leading-snug text-zinc-400"
          title={buildModerationTooltip(detail)}
        >
          <div className="font-semibold uppercase tracking-wide text-zinc-300">
            {detail?.status === "banned" ? "Banned" : "Limited (coinflip)"}
          </div>
          {untilLine ? (
            <div className="mt-1 font-mono text-zinc-400">{untilLine}</div>
          ) : null}
          {remaining ? (
            <div className="mt-0.5 text-amber-200/80">{remaining}</div>
          ) : null}
          {detail?.note ? (
            <div className="mt-1 text-zinc-500">Note: {detail.note}</div>
          ) : null}
        </div>
        <button
          type="button"
          className={cn(
            btnSm,
            "border-emerald-800/60 text-emerald-100 hover:bg-emerald-950/40",
          )}
          disabled={busyClear}
          title="Clears coinflip DB moderation, wager caps, and WS ban list entry for this user."
          onClick={onOpenClear}
        >
          {busyClear ? "Working…" : "Unban / Unlimit"}
        </button>

        <Modal
          isOpen={clearOpen}
          onClose={() => {
            if (!busyClear) setClearOpen(false);
          }}
          className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
        >
          <div className="p-6 pt-12">
            <h3 className="text-base font-semibold text-zinc-100">
              Clear coinflip moderation
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              Remove ban and limits for{" "}
              <span className="font-mono text-zinc-200">{username}</span> (DB + Redis
              coinflip paths). Fraud-only state may still exist until you clear fraud
              separately.
            </p>
            {clearMutation.isError ? (
              <p className="mt-2 text-xs text-rose-400" role="alert">
                {clearMutation.error instanceof Error
                  ? clearMutation.error.message
                  : "Request failed"}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={btnSm}
                disabled={busyClear}
                onClick={() => setClearOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  btnSm,
                  "border-emerald-700 bg-emerald-900/40 text-emerald-100",
                )}
                disabled={busyClear}
                onClick={() => clearMutation.mutate()}
              >
                {busyClear ? "Clearing…" : "Confirm clear"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FraudAdminActions
        username={username}
        disabled={fraudDisabled}
        className="justify-start"
        coinflipPlayerBanLimit
      />
    </div>
  );
}

function buildModerationTooltip(detail: CoinflipUserModerationDetail | undefined) {
  if (!detail) return "";
  const parts: string[] = [];
  if (detail.note) parts.push(`Note: ${detail.note}`);
  if (detail.banUntilIso)
    parts.push(`Ban until (profile): ${formatBannedUntilUtc(detail.banUntilIso)}`);
  return parts.join(" · ");
}
