"use client";

import { Modal } from "@/components/ui/modal";
import { ActiveGameCard } from "../components/ActiveGameCard";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { formatMoney } from "../components/formatMoney";
import { useCoinflipAdmin } from "../context/CoinflipAdminContext";
import {
  activeGameToCardModel,
  COINFLIP_ACTIVE_GAMES_QUERY_KEY,
  useCoinflipActiveGames,
} from "../hooks/useCoinflipActiveGames";
import { cancelCoinflipGame } from "@/lib/admin-api/coinflip-active-games";
import type { CoinflipActiveGame } from "@/lib/admin-api/coinflip-active-games";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export function ActiveGamesSection() {
  const { systemPaused, resolveActive } = useCoinflipAdmin();
  const showDev = process.env.NODE_ENV === "development";
  const queryClient = useQueryClient();

  const activeQuery = useCoinflipActiveGames();
  const games = activeQuery.data?.games ?? [];

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CoinflipActiveGame | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!bannerSuccess) return;
    const t = window.setTimeout(() => setBannerSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [bannerSuccess]);

  const cancelMutation = useMutation({
    mutationFn: (gameId: string) => cancelCoinflipGame(gameId),
    onSuccess: (data, gameId) => {
      setBannerError(null);
      setBannerSuccess(data.message);
      setCancelId(null);
      void queryClient.invalidateQueries({
        queryKey: COINFLIP_ACTIVE_GAMES_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: ["coinflipOverview"] });
      setDetail((d) => (d?.id === gameId ? null : d));
    },
    onError: (e: Error) => {
      setBannerError(e.message ?? "Cancel failed");
      setCancelId(null);
    },
  });

  const cancellingId =
    cancelMutation.isPending && cancelMutation.variables
      ? cancelMutation.variables
      : null;

  const confirmCancel = useCallback(() => {
    if (!cancelId || cancelMutation.isPending) return;
    cancelMutation.mutate(cancelId);
  }, [cancelId, cancelMutation]);

  const loadError =
    activeQuery.isError && activeQuery.error instanceof Error
      ? activeQuery.error.message
      : activeQuery.isError
        ? "Failed to load active games"
        : null;

  return (
    <section id="active" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Active games</h2>
        <p className="text-sm text-zinc-500">
          Live coinflip lobbies from Redis (same source as player WS). Cancelling
          refunds the creator for waiting games only.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}
      {bannerError ? (
        <p className="text-sm text-red-400" role="alert">
          {bannerError}
        </p>
      ) : null}
      {bannerSuccess ? (
        <p className="text-sm text-emerald-400" role="status">
          {bannerSuccess}
        </p>
      ) : null}

      {activeQuery.isPending && games.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 py-14 text-center text-sm text-zinc-500">
          Loading active games…
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/40 py-14 text-center text-sm text-zinc-500 transition-all duration-300">
          No active coinflip games.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {games.map((g) => {
            const cardModel = activeGameToCardModel(g);
            const canCancel = g.state === "waiting" && !systemPaused;
            return (
              <div key={g.id} className="transition-opacity duration-300">
                <ActiveGameCard
                  game={cardModel}
                  disabled={systemPaused}
                  onView={() => setDetail(g)}
                  onCancel={
                    canCancel ? () => setCancelId(g.id) : undefined
                  }
                  cancelBusy={cancellingId === g.id}
                  showDevActions={showDev}
                  onForceResolve={() => resolveActive(g.id)}
                />
                {g.state === "playing" ? (
                  <p className="mt-1 text-center text-xs text-zinc-600">
                    In progress — cancel disabled (settle or wait for resolution).
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelId}
        busy={cancelMutation.isPending}
        onClose={() => {
          if (cancelMutation.isPending) return;
          setCancelId(null);
        }}
        title="Cancel this game?"
        description={`Refunds the creator's wager to Redis balance and removes the lobby. Players mid-join may still race the server — the API will reject if the game already started.`}
        confirmLabel={
          cancelMutation.isPending ? "Cancelling…" : "Cancel game"
        }
        variant="warning"
        onConfirm={confirmCancel}
      />

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        className="mx-4 max-w-lg border border-zinc-800 bg-zinc-900"
      >
        {detail ? (
          <div className="max-h-[85vh] overflow-y-auto p-6 pt-12">
            <h3 className="font-mono text-lg text-sky-300">{detail.id}</h3>
            <p className="mt-1 text-xs text-zinc-500">
              State:{" "}
              <span className="font-medium text-zinc-300">
                {detail.state === "waiting" ? "Waiting" : "Playing"}
              </span>
              · Total wager {formatMoney(detail.totalWager)}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row
                k="Player 1"
                v={`${detail.player1.username} · ${detail.player1.side} · ${formatMoney(detail.player1.wager)}`}
              />
              <Row
                k="Player 2"
                v={
                  detail.player2
                    ? `${detail.player2.username} · ${detail.player2.side} · ${formatMoney(detail.player2.wager)}`
                    : "—"
                }
              />
              <Row
                k="Pot"
                v={formatMoney(
                  detail.player2
                    ? detail.player1.wager + detail.player2.wager
                    : detail.player1.wager,
                )}
              />
              <Row
                k="Created"
                v={new Date(detail.createdAt).toLocaleString()}
              />
            </dl>
            {detail.fairness ? (
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Fairness
                </h4>
                <dl className="mt-2 space-y-2 text-xs">
                  <Row k="Server seed hash" v={detail.fairness.serverSeedHash} />
                  <Row k="Nonce" v={detail.fairness.nonce} />
                  {detail.fairness.serverSeed ? (
                    <Row k="Server seed (revealed)" v={detail.fairness.serverSeed} />
                  ) : null}
                  {detail.fairness.eosBlockNum != null ? (
                    <Row
                      k="EOS block #"
                      v={String(detail.fairness.eosBlockNum)}
                    />
                  ) : null}
                  {detail.fairness.eosBlockId ? (
                    <Row k="EOS block id" v={detail.fairness.eosBlockId} />
                  ) : null}
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 break-all">
      <dt className="shrink-0 text-zinc-500">{k}</dt>
      <dd className="text-right text-zinc-200">{v}</dd>
    </div>
  );
}
