"use client";

import { banCoinflipPlayer } from "@/lib/admin-api/coinflip-players";
import { Modal } from "@/components/ui/modal";
import { COINFLIP_PLAYERS_KEY } from "../hooks/coinflip-players-query-keys";
import {
  COINFLIP_FRAUD_GAMES_KEY,
  COINFLIP_FRAUD_USERS_KEY,
  coinflipFraudProfileQueryKey,
} from "../hooks/coinflip-fraud-query-keys";
import {
  COINFLIP_USER_MODERATION_PREFIX,
  coinflipUserModerationQueryKey,
} from "../hooks/coinflip-user-moderation-query-key";
import { useFraudActions } from "../hooks/useFraudActions";
import { cn } from "./cn";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

type DialogKind = "flag" | "ban" | "clear" | null;

const btnSm =
  "rounded-lg border border-zinc-600/80 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

export type FraudAdminActionsProps = {
  username: string;
  /** When true, all actions are disabled (e.g. modal parent is closing). */
  disabled?: boolean;
  className?: string;
  /**
   * When true, Ban calls `/admin/coinflip/players/.../ban` (DB + WS).
   * When false (default), Ban uses fraud Redis tooling.
   */
  coinflipPlayerBanLimit?: boolean;
};

function defaultBanUntilIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

function localDatetimeValueFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Flag / ban / clear with one in-flight mutation at a time and form modals.
 */
export function FraudAdminActions({
  username,
  disabled = false,
  className,
  coinflipPlayerBanLimit = false,
}: FraudAdminActionsProps) {
  const queryClient = useQueryClient();
  const { flag, ban, clear } = useFraudActions();

  const [dialog, setDialog] = useState<DialogKind>(null);

  const [flagNote, setFlagNote] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banUntilLocal, setBanUntilLocal] = useState("");

  const closeAll = useCallback(() => {
    setDialog(null);
    setFlagNote("");
    setBanReason("");
    setBanUntilLocal("");
  }, []);

  const invalidateCoinflipSurface = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: COINFLIP_FRAUD_USERS_KEY });
    void queryClient.invalidateQueries({ queryKey: COINFLIP_FRAUD_GAMES_KEY });
    void queryClient.invalidateQueries({
      queryKey: coinflipFraudProfileQueryKey(username),
    });
    void queryClient.invalidateQueries({
      queryKey: [...COINFLIP_USER_MODERATION_PREFIX],
    });
    void queryClient.invalidateQueries({ queryKey: [...COINFLIP_PLAYERS_KEY] });
    void queryClient.invalidateQueries({
      queryKey: coinflipUserModerationQueryKey(username),
    });
  }, [queryClient, username]);

  const coinflipBanMut = useMutation({
    mutationFn: async () => {
      const reason = banReason.trim();
      if (!reason) throw new Error("Reason is required.");
      const untilIso = new Date(banUntilLocal).toISOString();
      if (!Number.isFinite(Date.parse(untilIso))) {
        throw new Error("Invalid ban end time.");
      }
      await banCoinflipPlayer(username, { reason, untilIso });
    },
    onSuccess: () => {
      invalidateCoinflipSurface();
      closeAll();
    },
  });

  const busy =
    disabled ||
    flag.isPending ||
    clear.isPending ||
    (coinflipPlayerBanLimit ? coinflipBanMut.isPending : ban.isPending);

  const open = (k: DialogKind) => {
    if (busy) return;
    if (coinflipPlayerBanLimit && k === "ban" && !banUntilLocal.trim()) {
      setBanUntilLocal(localDatetimeValueFromIso(defaultBanUntilIso()));
    }
    setDialog(k);
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <button
        type="button"
        className={btnSm}
        disabled={busy}
        onClick={() => open("flag")}
      >
        Flag
      </button>
      <button
        type="button"
        className={btnSm}
        disabled={busy}
        onClick={() => open("ban")}
      >
        Ban
      </button>
      <button
        type="button"
        className={cn(btnSm, "border-rose-800/60 text-rose-200 hover:bg-rose-950/50")}
        disabled={busy}
        onClick={() => open("clear")}
      >
        Clear
      </button>

      <Modal
        isOpen={dialog === "flag"}
        onClose={() => {
          if (!flag.isPending) closeAll();
        }}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
          <h3 className="text-base font-semibold text-zinc-100">Flag user</h3>
          <p className="mt-1 text-xs text-zinc-500">{username}</p>
          <label className="mt-4 block text-xs font-medium text-zinc-400">
            Note
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              placeholder="Reason shown to fraud tooling…"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={btnSm}
              disabled={flag.isPending}
              onClick={closeAll}
            >
              Cancel
            </button>
            <button
              type="button"
              className={cn(btnSm, "border-sky-600 bg-sky-700/40 text-sky-100")}
              disabled={flag.isPending || !flagNote.trim()}
              onClick={() => {
                flag.mutate(
                  { username, note: flagNote.trim() },
                  { onSuccess: closeAll },
                );
              }}
            >
              {flag.isPending ? "Saving…" : "Submit flag"}
            </button>
          </div>
          {flag.isError ? (
            <p className="mt-2 text-xs text-rose-400" role="alert">
              {flag.error instanceof Error ? flag.error.message : "Flag failed"}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={dialog === "ban"}
        onClose={() => {
          const p = coinflipPlayerBanLimit
            ? coinflipBanMut.isPending
            : ban.isPending;
          if (!p) closeAll();
        }}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        <div className="p-6 pt-12">
          <h3 className="text-base font-semibold text-rose-100">
            {coinflipPlayerBanLimit
              ? "Ban (coinflip DB + WS)"
              : "Ban (fraud + Redis)"}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">{username}</p>
          <label className="mt-4 block text-xs font-medium text-zinc-400">
            Reason
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            />
          </label>
         
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={btnSm}
              disabled={
                coinflipPlayerBanLimit
                  ? coinflipBanMut.isPending
                  : ban.isPending
              }
              onClick={closeAll}
            >
              Cancel
            </button>
            <button
              type="button"
              className={cn(btnSm, "border-rose-700 bg-rose-900/50 text-rose-100")}
              disabled={
                (coinflipPlayerBanLimit
                  ? coinflipBanMut.isPending
                  : ban.isPending) ||
                !banReason.trim() ||
                !banUntilLocal.trim()
              }
              onClick={() => {
                if (coinflipPlayerBanLimit) {
                  coinflipBanMut.mutate();
                  return;
                }
                const untilIso = new Date(banUntilLocal).toISOString();
                ban.mutate(
                  {
                    username,
                    payload: { reason: banReason.trim(), untilIso },
                  },
                  { onSuccess: closeAll },
                );
              }}
            >
              {(coinflipPlayerBanLimit ? coinflipBanMut.isPending : ban.isPending)
                ? "Banning…"
                : "Confirm ban"}
            </button>
          </div>
          {(coinflipPlayerBanLimit ? coinflipBanMut.isError : ban.isError) ? (
            <p className="mt-2 text-xs text-rose-400" role="alert">
              {(() => {
                const err = coinflipPlayerBanLimit
                  ? coinflipBanMut.error
                  : ban.error;
                return err instanceof Error ? err.message : "Ban failed";
              })()}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={dialog === "clear"}
        onClose={() => {
          if (!clear.isPending) closeAll();
        }}
        className="mx-4 max-w-md border border-zinc-800 bg-zinc-900"
      >
        <div className="p-6 pt-12">
          <h3 className="text-base font-semibold text-zinc-100">Clear fraud state</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Removes Redis fraud aggregates and mitigation for{" "}
            <span className="font-mono text-zinc-200">{username}</span>. Does not
            remove coinflip bans — unban separately if needed.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={btnSm}
              disabled={clear.isPending}
              onClick={closeAll}
            >
              Cancel
            </button>
            <button
              type="button"
              className={cn(btnSm, "border-rose-700 bg-rose-900/50 text-rose-100")}
              disabled={clear.isPending}
              onClick={() => {
                clear.mutate({ username }, { onSuccess: closeAll });
              }}
            >
              {clear.isPending ? "Clearing…" : "Clear"}
            </button>
          </div>
          {clear.isError ? (
            <p className="mt-2 text-xs text-rose-400" role="alert">
              {clear.error instanceof Error ? clear.error.message : "Clear failed"}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
