"use client";

import { CountdownTimer } from "../components/CountdownTimer";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { RaceCard } from "../components/RaceCard";
import { StatCard } from "../components/StatCard";
import { formatCompact, formatMoney } from "../components/formatMoney";
import { useRaceAdmin } from "../context/RaceAdminContext";
import { prizePool } from "../mock/data";
import Link from "next/link";
import { useEffect } from "react";

export function RaceOverviewSection() {
  const {
    loading,
    error,
    activeRace,
    scheduledRace,
    liveLeaderboard,
    trackingPaused,
    refreshOverview,
    refreshAll,
  } = useRaceAdmin();

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshOverview();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [refreshOverview]);

  const hasCurrent = !!activeRace || !!scheduledRace;
  const primary = activeRace ?? scheduledRace;
  const isLive = !!activeRace;

  const statusLabel = !activeRace
    ? scheduledRace
      ? "Upcoming"
      : "Idle"
    : activeRace.status === "paused"
      ? "Paused"
      : "Active";

  if (loading) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-zinc-500">Loading race overview…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-gray-200 pb-6 dark:border-gray-800">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-amber-400/90">
          Race system
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-800 dark:text-white/90 md:text-3xl">
          Race overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Live data from the admin API: global wagering race, leaderboard, and
          queued events.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {!hasCurrent ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/20 py-20 text-center">
          <p className="text-lg font-medium text-zinc-300">No active race</p>
          <p className="mt-2 text-sm text-zinc-500">
            Schedule a new race or check the queue after the current window
            ends.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/admin/race/create"
              className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg"
            >
              Create race
            </Link>
            <Link
              href="/admin/race/history"
              className="rounded-xl border border-zinc-600 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              View history
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Status: {statusLabel}
            </span>
            {trackingPaused && isLive && activeRace?.status === "active" ? (
              <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                Tracking paused
              </span>
            ) : null}
          </div>

          {primary ? (
            <RaceCard
              race={primary}
              href={`/admin/race/${primary.id}`}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-6">
            <div className="lg:col-span-2">
              {primary ? (
                isLive ? (
                  <CountdownTimer
                    targetIso={primary.endTime}
                    label="Time left"
                  />
                ) : (
                  <CountdownTimer
                    targetIso={primary.startTime}
                    label="Starts in"
                  />
                )
              ) : null}
            </div>
            <div className="contents lg:col-span-4 lg:grid lg:grid-cols-4 lg:gap-4">
              <StatCard
                label="Prize pool"
                value={
                  primary ? formatMoney(prizePool(primary)) : "—"
                }
              />
              <StatCard
                label="Participants"
                value={
                  primary
                    ? formatCompact(primary.totalParticipants)
                    : "—"
                }
              />
              <StatCard
                label="Total wagered"
                value={
                  primary ? formatMoney(primary.totalWagered) : "—"
                }
              />
              <StatCard
                label="Race window"
                value={
                  primary
                    ? `${new Date(primary.startTime).toLocaleDateString()}`
                    : "—"
                }
                hint={
                  primary
                    ? `Ends ${new Date(primary.endTime).toLocaleString()}`
                    : undefined
                }
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  Leaderboard
                </h2>
                <p className="text-sm text-zinc-500">
                  Top 10 · {isLive ? "Live (from API)" : "Snapshot"}
                </p>
              </div>
              <Link
                href="/admin/race/history"
                className="text-sm font-medium text-amber-500/90 hover:text-amber-400"
              >
                History →
              </Link>
            </div>
            {isLive ? (
              <LeaderboardTable
                entries={liveLeaderboard}
                animated={
                  !trackingPaused && activeRace?.status !== "paused"
                }
              />
            ) : scheduledRace ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 py-12 text-center text-sm text-zinc-500">
                Leaderboard opens when the race goes live.
              </div>
            ) : null}
          </div>
        </>
      )}

      {scheduledRace && activeRace ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-100">Next race</h2>
          <RaceCard
            race={scheduledRace}
            href={`/admin/race/${scheduledRace.id}`}
          />
        </div>
      ) : null}
    </div>
  );
}
