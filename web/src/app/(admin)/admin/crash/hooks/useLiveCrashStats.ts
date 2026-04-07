"use client";

import { initialLiveStats } from "../mock/data";
import type { LiveStatsSnapshot } from "../mock/types";
import { useEffect, useRef, useState } from "react";

export function useLiveCrashStats(frozen: boolean, intervalMs = 1400) {
  const [stats, setStats] = useState<LiveStatsSnapshot>(initialLiveStats);
  const ref = useRef(stats);
  ref.current = stats;

  useEffect(() => {
    if (frozen) return;
    const id = window.setInterval(() => {
      setStats((prev) => {
        const drift = (Math.random() - 0.45) * 0.06;
        const mult = Math.max(
          1.0,
          Math.min(7.5, +(prev.multiplier + drift).toFixed(2))
        );
        const betDelta = Math.round((Math.random() - 0.5) * 800);
        const payoutDelta = Math.round((Math.random() - 0.52) * 700);
        const nextBets = Math.max(0, prev.totalBets + betDelta);
        const nextPayout = Math.max(0, prev.totalPayout + payoutDelta);
        const nextPl = Math.round(nextBets - nextPayout);
        const ap = Math.max(
          0,
          prev.activePlayers + Math.round((Math.random() - 0.5) * 24)
        );
        return {
          multiplier: mult,
          totalBets: nextBets,
          totalPayout: nextPayout,
          profitLoss: nextPl,
          activePlayers: ap,
        };
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [frozen, intervalMs]);

  return stats;
}
