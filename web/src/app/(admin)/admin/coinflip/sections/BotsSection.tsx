"use client";

import { CoinflipPanelCard } from "../components/CoinflipPanelCard";
import {
  createCoinflipBot,
  deleteCoinflipBot,
  fetchCoinflipBots,
  resyncCoinflipBotsRedis,
  updateCoinflipBot,
  type CoinflipBotRow,
} from "@/lib/admin-api/coinflip-bots";
import { useCallback, useEffect, useState } from "react";

const defaultForm = {
  username: "",
  profilePicture: "",
  initialBalance: 1_000_000,
  isActive: true,
  minBet: 0.01,
  maxBet: 1_000_000,
  joinDelayMinMs: 200,
  joinDelayMaxMs: 1200,
  behaviorTier: 1 as 0 | 1 | 2,
  selectionWeight: 1,
};

export function BotsSection() {
  const [rows, setRows] = useState<CoinflipBotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...defaultForm });
  const [editUser, setEditUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...defaultForm });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchCoinflipBots();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (b: CoinflipBotRow) => {
    const c = (b.botConfig ?? {}) as Record<string, unknown>;
    setEditUser(b.username);
    setEditForm({
      username: b.username,
      profilePicture: b.profile_picture,
      initialBalance: Number(b.balance) || 0,
      isActive: typeof c.isActive === "boolean" ? c.isActive : true,
      minBet: typeof c.minBet === "number" ? c.minBet : 0.01,
      maxBet: typeof c.maxBet === "number" ? c.maxBet : 1_000_000,
      joinDelayMinMs:
        typeof c.joinDelayMinMs === "number" ? c.joinDelayMinMs : 200,
      joinDelayMaxMs:
        typeof c.joinDelayMaxMs === "number" ? c.joinDelayMaxMs : 1200,
      behaviorTier:
        c.behaviorTier === 0 || c.behaviorTier === 1 || c.behaviorTier === 2
          ? c.behaviorTier
          : 1,
      selectionWeight:
        typeof c.selectionWeight === "number" ? c.selectionWeight : 1,
    });
  };

  return (
    <section id="bots" className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Bot roster
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Coinflip joiner accounts stored as real users; configs sync to Redis{" "}
          <span className="font-mono text-gray-600 dark:text-gray-500">
            coinflip:bots
          </span>{" "}
          for the game WS (no DB reads on join).
        </p>
      </div>

      <CoinflipPanelCard>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void load()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-zinc-200"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await resyncCoinflipBotsRedis();
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Resync failed");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-zinc-200"
          >
            Resync Redis
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCreateOpen((v) => !v);
              setCreateForm({ ...defaultForm });
            }}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            {createOpen ? "Close form" : "New bot"}
          </button>
        </div>

        {error ? (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {createOpen ? (
          <form
            className="space-y-3 border-b border-gray-100 p-4 dark:border-gray-800"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await createCoinflipBot({
                  username: createForm.username.trim(),
                  profilePicture: createForm.profilePicture.trim() || undefined,
                  initialBalance: createForm.initialBalance,
                  config: {
                    isActive: createForm.isActive,
                    minBet: createForm.minBet,
                    maxBet: createForm.maxBet,
                    joinDelayMinMs: createForm.joinDelayMinMs,
                    joinDelayMaxMs: createForm.joinDelayMaxMs,
                    behaviorTier: createForm.behaviorTier,
                    selectionWeight: createForm.selectionWeight,
                  },
                });
                setCreateOpen(false);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Create failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              Create bot user
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Username
                <input
                  required
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((s) => ({ ...s, username: e.target.value }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Avatar URL
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.profilePicture}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      profilePicture: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Initial balance
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.initialBalance}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      initialBalance: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) =>
                    setCreateForm((s) => ({ ...s, isActive: e.target.checked }))
                  }
                />
                Active
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Min bet
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.minBet}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      minBet: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Max bet
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.maxBet}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      maxBet: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Delay min (ms)
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.joinDelayMinMs}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      joinDelayMinMs: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Delay max (ms)
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.joinDelayMaxMs}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      joinDelayMaxMs: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Behavior
                <select
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.behaviorTier}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      behaviorTier: Number(e.target.value) as 0 | 1 | 2,
                    }))
                  }
                >
                  <option value={0}>Passive</option>
                  <option value={1}>Neutral</option>
                  <option value={2}>Aggressive</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Selection weight
                <input
                  type="number"
                  step="0.1"
                  min={0.01}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={createForm.selectionWeight}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      selectionWeight: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
            >
              Create
            </button>
          </form>
        ) : null}

        {editUser ? (
          <form
            className="space-y-3 border-b border-gray-100 p-4 dark:border-gray-800"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editUser) return;
              setBusy(true);
              setError(null);
              try {
                await updateCoinflipBot(editUser, {
                  profilePicture:
                    editForm.profilePicture.trim() || undefined,
                  config: {
                    isActive: editForm.isActive,
                    minBet: editForm.minBet,
                    maxBet: editForm.maxBet,
                    joinDelayMinMs: editForm.joinDelayMinMs,
                    joinDelayMaxMs: editForm.joinDelayMaxMs,
                    behaviorTier: editForm.behaviorTier,
                    selectionWeight: editForm.selectionWeight,
                  },
                });
                setEditUser(null);
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Update failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              Edit {editUser}
            </p>
            <label className="block text-xs text-gray-600 dark:text-zinc-400">
              Avatar URL
              <input
                className="mt-1 w-full max-w-md rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                value={editForm.profilePicture}
                onChange={(e) =>
                  setEditForm((s) => ({
                    ...s,
                    profilePicture: e.target.value,
                  }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm((s) => ({ ...s, isActive: e.target.checked }))
                  }
                />
                Active
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Min bet
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={editForm.minBet}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      minBet: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Max bet
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={editForm.maxBet}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      maxBet: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Delay min (ms)
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={editForm.joinDelayMinMs}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      joinDelayMinMs: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Delay max (ms)
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={editForm.joinDelayMaxMs}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      joinDelayMaxMs: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Behavior
                <select
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={editForm.behaviorTier}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      behaviorTier: Number(e.target.value) as 0 | 1 | 2,
                    }))
                  }
                >
                  <option value={0}>Passive</option>
                  <option value={1}>Neutral</option>
                  <option value={2}>Aggressive</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                Selection weight
                <input
                  type="number"
                  step="0.1"
                  min={0.01}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-zinc-900"
                  value={editForm.selectionWeight}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      selectionWeight: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto p-2">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading…</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-gray-500 dark:text-zinc-500">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Bet range</th>
                  <th className="px-3 py-2">Delay ms</th>
                  <th className="px-3 py-2">Balance</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-zinc-200">
                {rows.map((b) => {
                  const c = (b.botConfig ?? {}) as Record<string, unknown>;
                  const active = c.isActive === true;
                  const minB = typeof c.minBet === "number" ? c.minBet : "—";
                  const maxB = typeof c.maxBet === "number" ? c.maxBet : "—";
                  const d0 =
                    typeof c.joinDelayMinMs === "number"
                      ? c.joinDelayMinMs
                      : "—";
                  const d1 =
                    typeof c.joinDelayMaxMs === "number"
                      ? c.joinDelayMaxMs
                      : "—";
                  return (
                    <tr
                      key={b.id}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 font-medium">{b.username}</td>
                      <td className="px-3 py-2">
                        {active ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="text-gray-400">Inactive</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {minB} — {maxB}
                      </td>
                      <td className="px-3 py-2">
                        {d0} — {d1}
                      </td>
                      <td className="px-3 py-2">{String(b.balance)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="mr-2 text-sky-600 underline dark:text-sky-400"
                          onClick={() => openEdit(b)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 underline dark:text-red-400"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Remove bot flag for ${b.username}? The user row stays in the database.`,
                              )
                            )
                              return;
                            setBusy(true);
                            setError(null);
                            try {
                              await deleteCoinflipBot(b.username);
                              await load();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Delete failed",
                              );
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && rows.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No bots configured.</p>
          ) : null}
        </div>
      </CoinflipPanelCard>
    </section>
  );
}
