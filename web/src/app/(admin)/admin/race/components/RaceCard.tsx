"use client";

import type { Race } from "../mock/types";
import { prizePool } from "../mock/data";
import { formatCompact, formatMoney } from "./formatMoney";
import { cn } from "./cn";
import Link from "next/link";

function statusBadge(status: Race["status"]) {
  const map: Record<Race["status"], string> = {
    active:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    paused:
      "border-amber-500/40 bg-amber-500/10 text-amber-200",
    scheduled:
      "border-sky-500/40 bg-sky-500/10 text-sky-300",
    ended: "border-zinc-600 bg-zinc-800/50 text-zinc-400",
    cancelled: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  };
  const label =
    status === "scheduled"
      ? "Upcoming"
      : status === "paused"
        ? "Paused"
        : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        map[status]
      )}
    >
      {label}
    </span>
  );
}

export function RaceCard({
  race,
  href,
}: {
  race: Race;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 p-5 shadow-lg transition-all duration-300",
        href && "hover:border-amber-500/25 hover:shadow-amber-500/10"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{race.name}</h3>
          {race.description ? (
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              {race.description}
            </p>
          ) : null}
        </div>
        {statusBadge(race.status)}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">Prize pool</dt>
          <dd className="font-mono text-sm font-semibold text-amber-200/90">
            {formatMoney(prizePool(race))}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Participants</dt>
          <dd className="font-mono text-sm text-zinc-200">
            {formatCompact(race.totalParticipants)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Wagered</dt>
          <dd className="font-mono text-sm text-zinc-200">
            {formatMoney(race.totalWagered)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        {new Date(race.startTime).toLocaleString()} →{" "}
        {new Date(race.endTime).toLocaleString()}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
