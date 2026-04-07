"use client";

import {
  DEFAULT_MINES_CONFIG,
  DEFAULT_MINES_RISK,
  INITIAL_HISTORY,
  INITIAL_PLAYER_STATS,
  randomLiveGame,
} from "../mock/data";
import type {
  MinesGameConfig,
  MinesHistoryRow,
  MinesLiveGame,
  MinesPlayerStat,
  MinesRiskLimits,
} from "../mock/types";
import {
  fetchMinesSystemState,
  postMinesPause,
  postMinesResume,
  postMinesResetActive,
  postMinesToggleNewGames,
} from "@/lib/admin-api/mines-manual-control";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

const INITIAL_LIVE: MinesLiveGame[] = Array.from({ length: 6 }, (_, i) =>
  randomLiveGame(i + 40),
);

interface State {
  config: MinesGameConfig;
  risk: MinesRiskLimits;
  history: MinesHistoryRow[];
  playerStats: MinesPlayerStat[];
  liveGames: MinesLiveGame[];
  systemPaused: boolean;
  newGamesDisabled: boolean;
}

type Action =
  | { type: "SET_CONFIG"; payload: Partial<MinesGameConfig> }
  | { type: "SET_RISK"; payload: Partial<MinesRiskLimits> }
  | {
      type: "HYDRATE_MINES_SYSTEM";
      systemPaused: boolean;
      newGamesDisabled: boolean;
    }
  | { type: "SET_LIVE"; games: MinesLiveGame[] }
  | { type: "SET_LIVE_FN"; fn: (prev: MinesLiveGame[]) => MinesLiveGame[] }
  | { type: "RESET_LIVE" }
  | { type: "ADD_LIVE"; game: MinesLiveGame }
  | { type: "ADD_HISTORY"; row: MinesHistoryRow }
  | { type: "BAN_PLAYER"; username: string }
  | { type: "FLAG_PLAYER"; username: string };

const initConfig: MinesGameConfig = { ...DEFAULT_MINES_CONFIG };
const initRisk: MinesRiskLimits = { ...DEFAULT_MINES_RISK };

const initialState: State = {
  config: initConfig,
  risk: initRisk,
  history: INITIAL_HISTORY.map((h) => ({
    ...h,
    mineIndices: [...h.mineIndices],
    revealedIndices: [...h.revealedIndices],
  })),
  playerStats: INITIAL_PLAYER_STATS.map((p) => ({ ...p })),
  liveGames: INITIAL_LIVE.map((g) => ({
    ...g,
    cells: [...g.cells],
    mineIndices: [...g.mineIndices],
  })),
  systemPaused: false,
  newGamesDisabled: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_CONFIG":
      return { ...state, config: { ...state.config, ...action.payload } };
    case "SET_RISK":
      return { ...state, risk: { ...state.risk, ...action.payload } };
    case "HYDRATE_MINES_SYSTEM":
      return {
        ...state,
        systemPaused: action.systemPaused,
        newGamesDisabled: action.newGamesDisabled,
      };
    case "SET_LIVE":
      return { ...state, liveGames: action.games };
    case "SET_LIVE_FN":
      return { ...state, liveGames: action.fn(state.liveGames) };
    case "RESET_LIVE":
      return { ...state, liveGames: [] };
    case "ADD_LIVE":
      return {
        ...state,
        liveGames: [
          {
            ...action.game,
            cells: [...action.game.cells],
            mineIndices: [...action.game.mineIndices],
          },
          ...state.liveGames,
        ],
      };
    case "ADD_HISTORY":
      return { ...state, history: [action.row, ...state.history] };
    case "BAN_PLAYER":
      return {
        ...state,
        playerStats: state.playerStats.map((p) =>
          p.username === action.username
            ? { ...p, username: `${p.username} (banned mock)` }
            : p,
        ),
      };
    case "FLAG_PLAYER":
      return {
        ...state,
        history: [
          {
            id: `mn-flag-${Date.now()}`,
            username: action.username,
            betAmount: 0,
            minesCount: 0,
            tilesCleared: 0,
            cashoutMultiplier: 0,
            profitLoss: 0,
            timestamp: new Date().toISOString(),
            gridSize: 5,
            mineIndices: [],
            revealedIndices: [],
          },
          ...state.history,
        ],
      };
    default:
      return state;
  }
}

interface MinesAdminContextValue extends State {
  setConfig: (p: Partial<MinesGameConfig>) => void;
  setRisk: (p: Partial<MinesRiskLimits>) => void;
  setLiveGames: (games: MinesLiveGame[]) => void;
  updateLiveGames: (fn: (prev: MinesLiveGame[]) => MinesLiveGame[]) => void;
  addLiveGame: (g: MinesLiveGame) => void;
  addHistory: (r: MinesHistoryRow) => void;
  banPlayer: (username: string) => void;
  flagPlayer: (username: string) => void;
  minesSystemHydrated: boolean;
  minesControlsBusy: boolean;
  minesControlError: string | null;
  clearMinesControlError: () => void;
  refreshState: () => Promise<void>;
  pauseMines: () => Promise<void>;
  resumeMines: () => Promise<void>;
  toggleNewGames: () => Promise<void>;
  resetActiveGames: () => Promise<
    Awaited<ReturnType<typeof postMinesResetActive>>
  >;
}

const MinesAdminContext = createContext<MinesAdminContextValue | null>(null);

export function MinesAdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [minesSystemHydrated, setMinesSystemHydrated] = useState(false);
  const [minesControlsBusy, setMinesControlsBusy] = useState(false);
  const [minesControlError, setMinesControlError] = useState<string | null>(
    null,
  );

  const clearMinesControlError = useCallback(() => {
    setMinesControlError(null);
  }, []);

  const applyServerState = useCallback(
    (s: Awaited<ReturnType<typeof fetchMinesSystemState>>) => {
      dispatch({
        type: "HYDRATE_MINES_SYSTEM",
        systemPaused: s.systemPaused,
        newGamesDisabled: s.newGamesDisabled,
      });
    },
    [],
  );

  const loadState = useCallback(async () => {
    const s = await fetchMinesSystemState();
    applyServerState(s);
  }, [applyServerState]);

  const refreshState = useCallback(async () => {
    setMinesControlsBusy(true);
    setMinesControlError(null);
    try {
      await loadState();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load Mines state";
      setMinesControlError(msg);
    } finally {
      setMinesControlsBusy(false);
      setMinesSystemHydrated(true);
    }
  }, [loadState]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const pauseMines = useCallback(async () => {
    setMinesControlsBusy(true);
    setMinesControlError(null);
    try {
      await postMinesPause();
      await loadState();
      dispatch({ type: "RESET_LIVE" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to pause Mines";
      setMinesControlError(msg);
      throw e;
    } finally {
      setMinesControlsBusy(false);
    }
  }, [loadState]);

  const resumeMines = useCallback(async () => {
    setMinesControlsBusy(true);
    setMinesControlError(null);
    try {
      await postMinesResume();
      await loadState();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resume Mines";
      setMinesControlError(msg);
      throw e;
    } finally {
      setMinesControlsBusy(false);
    }
  }, [loadState]);

  const toggleNewGames = useCallback(async () => {
    setMinesControlsBusy(true);
    setMinesControlError(null);
    try {
      await postMinesToggleNewGames();
      await loadState();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to update new-games policy";
      setMinesControlError(msg);
      throw e;
    } finally {
      setMinesControlsBusy(false);
    }
  }, [loadState]);

  const resetActiveGames = useCallback(async () => {
    setMinesControlsBusy(true);
    setMinesControlError(null);
    try {
      const summary = await postMinesResetActive();
      await loadState();
      dispatch({ type: "RESET_LIVE" });
      return summary;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to reset active games";
      setMinesControlError(msg);
      throw e;
    } finally {
      setMinesControlsBusy(false);
    }
  }, [loadState]);

  const setConfig = useCallback((payload: Partial<MinesGameConfig>) => {
    dispatch({ type: "SET_CONFIG", payload });
  }, []);
  const setRisk = useCallback((payload: Partial<MinesRiskLimits>) => {
    dispatch({ type: "SET_RISK", payload });
  }, []);
  const setLiveGames = useCallback((games: MinesLiveGame[]) => {
    dispatch({ type: "SET_LIVE", games });
  }, []);
  const updateLiveGames = useCallback(
    (fn: (prev: MinesLiveGame[]) => MinesLiveGame[]) => {
      dispatch({ type: "SET_LIVE_FN", fn });
    },
    [],
  );
  const addLiveGame = useCallback((game: MinesLiveGame) => {
    dispatch({ type: "ADD_LIVE", game });
  }, []);
  const addHistory = useCallback((row: MinesHistoryRow) => {
    dispatch({ type: "ADD_HISTORY", row });
  }, []);
  const banPlayer = useCallback((username: string) => {
    dispatch({ type: "BAN_PLAYER", username });
  }, []);
  const flagPlayer = useCallback((username: string) => {
    dispatch({ type: "FLAG_PLAYER", username });
  }, []);

  const value = useMemo<MinesAdminContextValue>(
    () => ({
      ...state,
      setConfig,
      setRisk,
      setLiveGames,
      updateLiveGames,
      addLiveGame,
      addHistory,
      banPlayer,
      flagPlayer,
      minesSystemHydrated,
      minesControlsBusy,
      minesControlError,
      clearMinesControlError,
      refreshState,
      pauseMines,
      resumeMines,
      toggleNewGames,
      resetActiveGames,
    }),
    [
      state,
      setConfig,
      setRisk,
      setLiveGames,
      updateLiveGames,
      addLiveGame,
      addHistory,
      banPlayer,
      flagPlayer,
      minesSystemHydrated,
      minesControlsBusy,
      minesControlError,
      clearMinesControlError,
      refreshState,
      pauseMines,
      resumeMines,
      toggleNewGames,
      resetActiveGames,
    ],
  );

  return (
    <MinesAdminContext.Provider value={value}>
      {children}
    </MinesAdminContext.Provider>
  );
}

export function useMinesAdmin() {
  const ctx = useContext(MinesAdminContext);
  if (!ctx) {
    throw new Error("useMinesAdmin must be used within MinesAdminProvider");
  }
  return ctx;
}
