"use client";

import type { ActiveCoinflipGame } from "../mock/types";
import { formatMoney } from "./formatMoney";
import { PlayerBadge } from "./PlayerBadge";
import { cn } from "./cn";

interface ActiveGameCardProps {
  game: ActiveCoinflipGame;
  onCancel?: () => void;
  onView?: () => void;
  onForceResolve?: () => void;
  showDevActions?: boolean;
  disabled?: boolean;
  /** When true, Cancel shows a loading label and is non-interactive. */
  cancelBusy?: boolean;
}

export function ActiveGameCard({
  game,
  onCancel,
  onView,
  onForceResolve,
  showDevActions,
  disabled,
  cancelBusy,
}: ActiveGameCardProps) {
  const pot = game.player2
    ? game.player1.wager + game.player2.wager
    : game.player1.wager;
  const bigPot = pot >= 1500;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg",
        bigPot
          ? "border-amber-500/40 from-amber-950/40 via-zinc-900/90 to-zinc-950 shadow-amber-500/10"
          : "border-zinc-800 from-zinc-900/90 to-zinc-950 shadow-black/20",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <span className="font-mono text-xs text-zinc-500">{game.id}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            game.status === "waiting"
              ? "bg-amber-500/15 text-amber-400"
              : "bg-sky-500/15 text-sky-300"
          )}
        >
          {game.status === "waiting" ? "Waiting" : "Active"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
          <PlayerBadge
            username={game.player1.username}
            sub={`${formatMoney(game.player1.wager)} · ${game.player1.side}`}
          />
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3">
          {game.player2 ? (
            <PlayerBadge
              username={game.player2.username}
              sub={`${formatMoney(game.player2.wager)} · ${game.player2.side}`}
            />
          ) : (
            <p className="py-2 text-center text-sm italic text-zinc-500">
              Waiting for opponent…
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">Total pot</p>
          <p
            className={cn(
              "font-mono text-lg font-semibold",
              bigPot ? "text-amber-300" : "text-zinc-100"
            )}
          >
            {formatMoney(pot)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onView ? (
            <button
              type="button"
              onClick={onView}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Details
            </button>
          ) : null}
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={!!cancelBusy}
              className="rounded-lg border border-rose-600/50 bg-rose-600/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-600/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelBusy ? "Cancelling…" : "Cancel"}
            </button>
          ) : null}
          {showDevActions && onForceResolve ? (
            <button
              type="button"
              onClick={onForceResolve}
              disabled={!game.player2}
              className="rounded-lg border border-violet-600/50 bg-violet-600/15 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-600/25 disabled:opacity-40"
            >
              Force resolve
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
