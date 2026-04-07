"use client";

import { InputField } from "../components/InputField";
import { RaceAdminShell } from "../components/RaceAdminShell";
import { RewardInputRow } from "../components/RewardInputRow";
import { overlaps } from "../mock/data";
import { useRaceAdmin } from "../context/RaceAdminContext";
import { buildContiguousRewardTiers } from "../lib/build-create-reward-tiers";
import { inferRaceWindowLabel } from "../lib/race-mappers";
import {
  createRaceApi,
  racesAxiosErrorMessage,
} from "@/lib/admin-api/races";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function toLocalInputValue(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateRacePage() {
  const router = useRouter();
  const { activeRace, scheduledRace, refreshAll } = useRaceAdmin();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 3600000).toISOString()),
  );
  const [end, setEnd] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 72 * 3600000).toISOString()),
  );
  const [rewards, setRewards] = useState(() => [
    5000, 3000, 2000, 1200, 800, 500, 400, 300, 200, 100,
  ]);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const startIso = useMemo(() => {
    const t = new Date(start).getTime();
    return Number.isNaN(t) ? "" : new Date(t).toISOString();
  }, [start]);
  const endIso = useMemo(() => {
    const t = new Date(end).getTime();
    return Number.isNaN(t) ? "" : new Date(t).toISOString();
  }, [end]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!startIso || !endIso) e.push("Valid start and end times required.");
    if (startIso && endIso && startIso >= endIso)
      e.push("Start time must be before end time.");
    try {
      buildContiguousRewardTiers(rewards);
    } catch (err) {
      e.push(err instanceof Error ? err.message : "Invalid reward tiers");
    }
    for (let i = 0; i < 10; i++) {
      const v = Number(rewards[i]);
      if (Number.isNaN(v) || v < 0)
        e.push(`Reward for rank ${i + 1} cannot be negative.`);
    }
    if (startIso && endIso) {
      if (
        activeRace &&
        overlaps(startIso, endIso, activeRace.startTime, activeRace.endTime)
      )
        e.push("Overlaps the current live race window.");
      if (
        scheduledRace &&
        overlaps(startIso, endIso, scheduledRace.startTime, scheduledRace.endTime)
      )
        e.push("Overlaps a scheduled race window.");
    }
    return e;
  }, [startIso, endIso, rewards, activeRace, scheduledRace]);

  const totalPool = useMemo(() => {
    try {
      return buildContiguousRewardTiers(rewards).reduce(
        (s, t) => s + t.rewardAmount,
        0,
      );
    } catch {
      return rewards.reduce((a, b) => a + (Number(b) || 0), 0);
    }
  }, [rewards]);

  const submit = async () => {
    setAttempted(true);
    setApiError(null);
    if (errors.length) return;
    setSubmitting(true);
    try {
      const tierPayload = buildContiguousRewardTiers(rewards);
      await createRaceApi({
        rewards: tierPayload,
        startTime: startIso,
        endTime: endIso,
        raceWindow: inferRaceWindowLabel(startIso, endIso),
      });
      await refreshAll();
      setToast(true);
      window.setTimeout(() => {
        setToast(false);
        router.push("/admin/race");
      }, 600);
    } catch (err) {
      setApiError(racesAxiosErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RaceAdminShell title="Create race">
      <header className="mb-8 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Create race
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Schedule a site-wide race. Enter rewards for ranks{" "}
          <strong className="text-zinc-400">1 through N</strong> (e.g. top 5 →
          five amounts, then zeros). Leave <strong className="text-zinc-400">0</strong>{" "}
          after your last paid rank — no gaps (you cannot skip rank 3). Each rank
          is stored as its own <code className="text-amber-200/90">RaceReward</code>{" "}
          row. Times and overlap are validated server-side.
        </p>
      </header>

      {toast ? (
        <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Race created — redirecting to overview…
        </div>
      ) : null}

      {apiError ? (
        <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
          {apiError}
        </div>
      ) : null}

      {attempted && errors.length > 0 ? (
        <ul className="mb-6 list-inside list-disc text-sm text-rose-400">
          {errors.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6 shadow-lg">
          <h2 className="text-sm font-semibold text-zinc-200">Basics</h2>
          <InputField
            id="race-name"
            label="Label (optional, local only)"
            value={name}
            onChange={setName}
            placeholder="e.g. Weekend Wager Rush"
          />
          <div>
            <label
              htmlFor="race-desc"
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              Notes (optional, not sent to API)
            </label>
            <textarea
              id="race-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/50 px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/15"
            />
          </div>
          <InputField
            id="race-start"
            label="Start time"
            type="datetime-local"
            value={start}
            onChange={setStart}
          />
          <InputField
            id="race-end"
            label="End time"
            type="datetime-local"
            value={end}
            onChange={setEnd}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6 shadow-lg">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">
              Rewards (top 10)
            </h2>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-right">
              <p className="text-xs text-amber-200/80">Sum of paid ranks (API)</p>
              <p className="font-mono text-lg font-bold text-amber-200">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(totalPool)}
              </p>
            </div>
          </div>
          <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {rewards.map((val, idx) => (
              <RewardInputRow
                key={idx}
                position={idx + 1}
                value={val}
                onChange={(v) =>
                  setRewards((r) => {
                    const next = [...r];
                    next[idx] = Number(v) || 0;
                    return next;
                  })
                }
                error={
                  attempted && !Number.isFinite(Number(val))
                    ? "Invalid"
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create race"}
        </button>
        <Link
          href="/admin/race"
          className="rounded-xl border border-zinc-600 px-6 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </Link>
      </div>
    </RaceAdminShell>
  );
}
