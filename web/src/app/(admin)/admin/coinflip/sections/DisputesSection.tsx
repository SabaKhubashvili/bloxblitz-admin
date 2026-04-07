"use client";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import { useCoinflipAdmin } from "../context/CoinflipAdminContext";
import { useState } from "react";
import { cn } from "../components/cn";

export function DisputesSection() {
  const { disputes, setDisputeStatus, flagPlayer, banPlayer } =
    useCoinflipAdmin();
  const [banUser, setBanUser] = useState<string | null>(null);

  return (
    <section id="disputes" className="scroll-mt-28 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Disputes & flags
        </h2>
        <p className="text-sm text-zinc-500">
          Review suspicious matches (mock workflow).
        </p>
      </div>

      <CoinflipPanelCard flush>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase text-zinc-500">
                <th className="px-4 py-3">Game</th>
                <th className="px-4 py-3">Players</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {disputes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    No open disputes.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr
                    key={d.id}
                    className="bg-zinc-900/30 hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-sky-400">
                      {d.gameId}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300">
                      {d.playersLabel}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">{d.reason}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          d.status === "pending"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-zinc-700 text-zinc-400"
                        )}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {d.status === "pending" ? (
                          <button
                            type="button"
                            className="text-xs text-sky-400 hover:underline"
                            onClick={() =>
                              setDisputeStatus(d.id, "reviewed")
                            }
                          >
                            Mark reviewed
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-xs text-amber-400 hover:underline"
                          onClick={() =>
                            flagPlayer(
                              d.playersLabel.split(" vs ")[0]?.trim() ||
                                d.playersLabel
                            )
                          }
                        >
                          Flag user
                        </button>
                        <button
                          type="button"
                          className="text-xs text-rose-400 hover:underline"
                          onClick={() =>
                            setBanUser(d.playersLabel.split(" vs ")[0] ?? "")
                          }
                        >
                          Ban user
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CoinflipPanelCard>

      <ConfirmDialog
        isOpen={!!banUser}
        onClose={() => setBanUser(null)}
        title="Ban user (mock)?"
        description={`Username: ${banUser} — renames row in player stats mock.`}
        confirmLabel="Ban"
        variant="danger"
        onConfirm={() => {
          if (banUser) banPlayer(banUser);
        }}
      />
    </section>
  );
}
