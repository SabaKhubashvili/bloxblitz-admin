"use client";

import {
  fetchCrashRuntimeState,
  postCrashDisableBets,
  postCrashEnableBets,
  postCrashPauseGame,
  postCrashResumeGame,
  type CrashRuntimeState,
} from "@/lib/admin-api/crash-control-room";
import { useCallback, useEffect, useState } from "react";

export function useCrashRuntimeControls() {
  const [state, setState] = useState<CrashRuntimeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchCrashRuntimeState();
      setState(s);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load crash runtime state",
      );
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (fn: () => Promise<CrashRuntimeState>): Promise<void> => {
      setError(null);
      try {
        const s = await fn();
        setState(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
        throw e;
      }
    },
    [],
  );

  return {
    paused: state?.paused ?? false,
    betsDisabled: state?.betsDisabled ?? false,
    ready: state !== null,
    loading,
    error,
    refresh,
    pauseGame: () => run(postCrashPauseGame),
    resumeGame: () => run(postCrashResumeGame),
    disableBets: () => run(postCrashDisableBets),
    enableBets: () => run(postCrashEnableBets),
  };
}
