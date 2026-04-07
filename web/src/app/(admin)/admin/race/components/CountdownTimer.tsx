"use client";

import { useEffect, useState } from "react";
import { cn } from "./cn";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownTimer({
  targetIso,
  label = "Time left",
  className,
}: {
  targetIso: string;
  label?: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const end = new Date(targetIso).getTime();
  const diff = Math.max(0, end - now);
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const done = diff <= 0;

  return (
    <div
      className={cn(
        "rounded-2xl h-full border border-zinc-800 bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-zinc-950 p-5 shadow-inner",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-amber-200/80">
        {label}
      </p>
      {done ? (
        <p className="mt-2 text-lg font-semibold text-zinc-400">Ended</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2 font-mono text-lg font-bold tabular-nums text-zinc-100 sm:text-2xl">
          {d > 0 ? (
            <span className="rounded-lg bg-zinc-950/60 px-2 py-1">
              {d}d
            </span>
          ) : null}
          <span className="rounded-lg bg-zinc-950/60 px-2 py-1">
            {pad(h)}
          </span>
          <span className="text-zinc-500">:</span>
          <span className="rounded-lg bg-zinc-950/60 px-2 py-1">
            {pad(m)}
          </span>
          <span className="text-zinc-500">:</span>
          <span className="rounded-lg bg-zinc-950/60 px-2 py-1">
            {pad(s)}
          </span>
        </div>
      )}
    </div>
  );
}
