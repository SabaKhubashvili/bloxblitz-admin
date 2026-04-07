"use client";

import { LeaderboardTable } from "../components/LeaderboardTable";
import { RaceAdminShell } from "../components/RaceAdminShell";
import { formatMoney } from "../components/formatMoney";
import { useRaceAdmin } from "../context/RaceAdminContext";
import { prizePool } from "../mock/data";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function RaceDetailPage() {
  const params = useParams();
  const raceId = params.raceId as string;
  const {
    getRaceById,
    activeRace,
    liveLeaderboard,
    trackingPaused,
    refreshAll,
  } = useRaceAdmin();
  const [recheck, setRecheck] = useState(false);

  const race = getRaceById(raceId);

  useEffect(() => {
    if (!race && raceId && !recheck) {
      setRecheck(true);
      void refreshAll();
    }
  }, [race, raceId, recheck, refreshAll]);

  const board = useMemo(() => {
    if (!race) return [];
    if (activeRace?.id === race.id) return liveLeaderboard;
    if (race.finalLeaderboard?.length) return race.finalLeaderboard;
    return [];
  }, [race, activeRace, liveLeaderboard]);

  if (!race) {
    return (
      <RaceAdminShell title="Race details">
        <div className="rounded-2xl border border-dashed border-zinc-700 py-20 text-center">
          <p className="text-zinc-400">
            {recheck ? "Race not found or still loading…" : "Race not found."}
          </p>
          <Link
            href="/admin/race/history"
            className="mt-4 inline-block text-sm text-amber-500 hover:text-amber-400"
          >
            ← Back to history
          </Link>
        </div>
      </RaceAdminShell>
    );
  }

  const pool = prizePool(race);
  const isLive =
    activeRace?.id === race.id &&
    (race.status === "active" || race.status === "paused");

  return (
    <RaceAdminShell title={race.name}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/race/history"
            className="text-sm text-amber-500/90 hover:text-amber-400"
          >
            ← History
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
            {race.name}
          </h1>
          {race.description ? (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {race.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs font-semibold uppercase text-zinc-400">
            {race.status}
          </span>
          {isLive && trackingPaused && race.status === "active" ? (
            <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
              Tracking paused
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Prize pool</p>
          <p className="mt-1 font-mono text-lg text-amber-200">
            {formatMoney(pool)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total wagered</p>
          <p className="mt-1 font-mono text-lg text-zinc-200">
            {formatMoney(race.totalWagered)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Participants</p>
          <p className="mt-1 font-mono text-lg text-zinc-200">
            {race.totalParticipants.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Window</p>
          <p className="mt-1 text-xs text-zinc-400">
            {new Date(race.startTime).toLocaleString()} —{" "}
            {new Date(race.endTime).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">
          Rewards distribution
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Display splits the stored prize pool across top 10 (template
          proportions).
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {race.rewards.map((amt, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2"
            >
              <p className="text-xs text-zinc-500">Top {i + 1}</p>
              <p className="font-mono text-sm text-emerald-400/90">
                {formatMoney(amt)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          {isLive ? "Live leaderboard" : "Final leaderboard"}
        </h2>
        <LeaderboardTable
          entries={board}
          animated={
            isLive &&
            !trackingPaused &&
            race.status !== "paused"
          }
          emptyMessage={
            race.status === "scheduled"
              ? "Leaderboard opens when the race starts."
              : "No leaderboard data."
          }
        />
      </div>
    </RaceAdminShell>
  );
}
