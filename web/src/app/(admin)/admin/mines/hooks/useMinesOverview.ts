"use client";

import {
  fetchMinesOverviewApi,
  type MinesOverviewResponse,
} from "@/lib/admin-api/mines-overview";
import type { MinesOverviewStats, TimeRange } from "../mock/types";
import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: string; y: number };

const responseCache = new Map<TimeRange, MinesOverviewResponse>();

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && e.name === "AbortError") return true;
  return false;
}

function applyResponseToSetter(
  res: MinesOverviewResponse,
  setStats: (v: MinesOverviewStats | null) => void,
  setGames: (v: Point[]) => void,
  setPl: (v: Point[]) => void,
  setMult: (v: Point[]) => void,
) {
  setStats(res.stats ?? null);
  const charts = res.charts;
  setGames([...(charts?.gamesPlayed ?? [])]);
  setPl([...(charts?.profitLoss ?? [])]);
  setMult([...(charts?.avgMultiplier ?? [])]);
}

export function useMinesOverview(
  range: TimeRange,
  _liveCount: number,
  _historyLen: number,
) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MinesOverviewStats | null>(null);
  const [gamesSeries, setGamesSeries] = useState<Point[]>([]);
  const [plSeries, setPlSeries] = useState<Point[]>([]);
  const [multSeries, setMultSeries] = useState<Point[]>([]);

  const fetchSeqRef = useRef(0);
  const hasShownDataRef = useRef(false);

  const reload = useCallback(async () => {
    const ac = new AbortController();
    const seq = ++fetchSeqRef.current;

    try {
      const res = await fetchMinesOverviewApi(range, { signal: ac.signal });
      if (seq !== fetchSeqRef.current) return;

      responseCache.set(range, res);
      applyResponseToSetter(res, setStats, setGamesSeries, setPlSeries, setMultSeries);
      hasShownDataRef.current = true;
      setLoading(false);
    } catch (e) {
      if (ac.signal.aborted || isAbortError(e)) return;
      if (seq !== fetchSeqRef.current) return;
      console.error("[useMinesOverview] fetch failed", e);
      setStats(null);
      setGamesSeries([]);
      setPlSeries([]);
      setMultSeries([]);
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const ac = new AbortController();
    const seq = ++fetchSeqRef.current;

    const cached = responseCache.get(range);
    if (cached) {
      applyResponseToSetter(
        cached,
        setStats,
        setGamesSeries,
        setPlSeries,
        setMultSeries,
      );
      hasShownDataRef.current = true;
      setLoading(false);
    } else if (!hasShownDataRef.current) {
      setLoading(true);
    }

    (async () => {
      try {
        const res = await fetchMinesOverviewApi(range, { signal: ac.signal });
        if (seq !== fetchSeqRef.current) return;

        responseCache.set(range, res);
        applyResponseToSetter(
          res,
          setStats,
          setGamesSeries,
          setPlSeries,
          setMultSeries,
        );
        hasShownDataRef.current = true;
      } catch (e) {
        if (ac.signal.aborted || isAbortError(e)) return;
        if (seq !== fetchSeqRef.current) return;
        console.error("[useMinesOverview] fetch failed", e);
        setStats(null);
        setGamesSeries([]);
        setPlSeries([]);
        setMultSeries([]);
      } finally {
        if (seq === fetchSeqRef.current && !ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [range]);

  return { loading, stats, gamesSeries, plSeries, multSeries, reload };
}
