"use client";

import type { LeaderboardEntry, Race } from "../mock/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchRaceHistory,
  fetchRaceOverview,
  racesAxiosErrorMessage,
} from "@/lib/admin-api/races";
import {
  mapActiveApiToRace,
  mapHistoryApiToRace,
  mapNextApiToRace,
  mapTop10ToLeaderboard,
} from "../lib/race-mappers";

type Ctx = {
  loading: boolean;
  error: string | null;
  /** True while a mutation runs */
  busy: boolean;
  pastRaces: Race[];
  activeRace: Race | null;
  scheduledRace: Race | null;
  liveLeaderboard: LeaderboardEntry[];
  trackingPaused: boolean;
  getRaceById: (id: string) => Race | undefined;
  refreshOverview: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setBusy: (v: boolean) => void;
};

const RaceAdminContext = createContext<Ctx | null>(null);

export function RaceAdminProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastRaces, setPastRaces] = useState<Race[]>([]);
  const [activeRace, setActiveRace] = useState<Race | null>(null);
  const [scheduledRace, setScheduledRace] = useState<Race | null>(null);
  const [liveLeaderboard, setLiveLeaderboard] = useState<LeaderboardEntry[]>(
    [],
  );
  const [trackingPaused, setTrackingPaused] = useState(false);

  const applyOverview = useCallback(
    (
      active: ReturnType<typeof mapActiveApiToRace> | null,
      scheduled: Race | null,
      top10: LeaderboardEntry[],
      tracking: boolean,
    ) => {
      setActiveRace(active);
      setScheduledRace(scheduled);
      setLiveLeaderboard(top10);
      setTrackingPaused(tracking);
    },
    [],
  );

  const refreshOverview = useCallback(async () => {
    const o = await fetchRaceOverview();
    if (!o.activeRace) {
      const scheduledOnly = o.nextRace ? mapNextApiToRace(o.nextRace) : null;
      applyOverview(null, scheduledOnly, [], false);
      return;
    }

    const active = mapActiveApiToRace(o.activeRace);
    const scheduled = o.nextRace ? mapNextApiToRace(o.nextRace) : null;
    const lb = mapTop10ToLeaderboard(o.top10, active.rewards);
    applyOverview(active, scheduled, lb, o.activeRace.trackingPaused);
  }, [applyOverview]);

  const refreshHistory = useCallback(async () => {
    const h = await fetchRaceHistory(50);
    setPastRaces(h.races.map(mapHistoryApiToRace));
  }, []);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([refreshOverview(), refreshHistory()]);
    } catch (e) {
      setError(racesAxiosErrorMessage(e));
      throw e;
    }
  }, [refreshOverview, refreshHistory]);

  const refreshOverviewRef = useRef(refreshOverview);
  const refreshHistoryRef = useRef(refreshHistory);
  refreshOverviewRef.current = refreshOverview;
  refreshHistoryRef.current = refreshHistory;

  /** Overview first so the page is not blocked if history is slow or stuck; then history. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        await refreshOverviewRef.current();
      } catch (e) {
        if (!cancelled) setError(racesAxiosErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (cancelled) return;
      try {
        await refreshHistoryRef.current();
      } catch (e) {
        setError((prev) => prev ?? racesAxiosErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getRaceById = useCallback(
    (id: string) => {
      if (activeRace?.id === id) return activeRace;
      if (scheduledRace?.id === id) return scheduledRace;
      return pastRaces.find((r) => r.id === id);
    },
    [activeRace, scheduledRace, pastRaces],
  );

  const value = useMemo<Ctx>(
    () => ({
      loading,
      error,
      busy,
      pastRaces,
      activeRace,
      scheduledRace,
      liveLeaderboard,
      trackingPaused,
      getRaceById,
      refreshOverview,
      refreshHistory,
      refreshAll,
      setBusy,
    }),
    [
      loading,
      error,
      busy,
      pastRaces,
      activeRace,
      scheduledRace,
      liveLeaderboard,
      trackingPaused,
      getRaceById,
      refreshOverview,
      refreshHistory,
      refreshAll,
    ],
  );

  return (
    <RaceAdminContext.Provider value={value}>
      {children}
    </RaceAdminContext.Provider>
  );
}

export function useRaceAdmin() {
  const ctx = useContext(RaceAdminContext);
  if (!ctx) throw new Error("useRaceAdmin must be used within RaceAdminProvider");
  return ctx;
}
