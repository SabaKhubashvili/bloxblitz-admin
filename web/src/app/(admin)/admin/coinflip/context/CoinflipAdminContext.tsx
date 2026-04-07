"use client";

import {
  DEFAULT_CONFIG,
  DEFAULT_RISK,
  INITIAL_ACTIVE,
  INITIAL_DISPUTES,
  INITIAL_HISTORY,
  INITIAL_PLAYER_STATS,
  mockResolvedFromActive,
} from "../mock/data";
import type {
  ActiveCoinflipGame,
  CoinflipConfig,
  CoinflipDisputeRow,
  CoinflipHistoryRow,
  CoinflipRiskLimits,
  DisputeStatus,
  PlayerCoinflipStat,
} from "../mock/types";
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

interface State {
  activeGames: ActiveCoinflipGame[];
  history: CoinflipHistoryRow[];
  disputes: CoinflipDisputeRow[];
  playerStats: PlayerCoinflipStat[];
  config: CoinflipConfig;
  risk: CoinflipRiskLimits;
  systemPaused: boolean;
  newGamesDisabled: boolean;
}

type Action =
  | { type: "REMOVE_ACTIVE"; id: string }
  | { type: "CLEAR_ACTIVE" }
  | { type: "ADD_HISTORY"; row: CoinflipHistoryRow }
  | { type: "RESOLVE_ACTIVE"; id: string }
  | { type: "ADD_ACTIVE"; game: ActiveCoinflipGame }
  | { type: "SET_DISPUTE_STATUS"; id: string; status: DisputeStatus }
  | { type: "SET_CONFIG"; payload: Partial<CoinflipConfig> }
  | { type: "SET_RISK"; payload: Partial<CoinflipRiskLimits> }
  | { type: "SET_PAUSED"; v: boolean }
  | { type: "SET_NEW_GAMES_DISABLED"; v: boolean }
  | { type: "UPDATE_PLAYER"; id: string; patch: Partial<PlayerCoinflipStat> }
  | { type: "FLAG_PLAYER"; username: string }
  | { type: "BAN_PLAYER"; username: string };

const initialState: State = {
  activeGames: INITIAL_ACTIVE.map((g) => ({
    ...g,
    player1: { ...g.player1 },
    player2: g.player2 ? { ...g.player2 } : null,
  })),
  history: [...INITIAL_HISTORY],
  disputes: [...INITIAL_DISPUTES],
  playerStats: INITIAL_PLAYER_STATS.map((p) => ({ ...p })),
  config: { ...DEFAULT_CONFIG },
  risk: { ...DEFAULT_RISK },
  systemPaused: false,
  newGamesDisabled: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "REMOVE_ACTIVE":
      return {
        ...state,
        activeGames: state.activeGames.filter((g) => g.id !== action.id),
      };
    case "CLEAR_ACTIVE":
      return { ...state, activeGames: [] };
    case "ADD_HISTORY":
      return {
        ...state,
        history: [action.row, ...state.history],
      };
    case "RESOLVE_ACTIVE": {
      const g = state.activeGames.find((x) => x.id === action.id);
      if (!g || g.status !== "active" || !g.player2) return state;
      const row = mockResolvedFromActive(g, state.config.platformFeePercent);
      return {
        ...state,
        activeGames: state.activeGames.filter((x) => x.id !== action.id),
        history: [row, ...state.history],
      };
    }
    case "ADD_ACTIVE":
      return {
        ...state,
        activeGames: [action.game, ...state.activeGames],
      };
    case "SET_DISPUTE_STATUS":
      return {
        ...state,
        disputes: state.disputes.map((d) =>
          d.id === action.id ? { ...d, status: action.status } : d
        ),
      };
    case "SET_CONFIG":
      return {
        ...state,
        config: { ...state.config, ...action.payload },
      };
    case "SET_RISK":
      return {
        ...state,
        risk: { ...state.risk, ...action.payload },
      };
    case "SET_PAUSED":
      return { ...state, systemPaused: action.v };
    case "SET_NEW_GAMES_DISABLED":
      return { ...state, newGamesDisabled: action.v };
    case "UPDATE_PLAYER":
      return {
        ...state,
        playerStats: state.playerStats.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p
        ),
      };
    case "FLAG_PLAYER":
      return {
        ...state,
        disputes: [
          {
            id: `dsp-${Date.now()}`,
            gameId: "—",
            playersLabel: action.username,
            reason: "Manually flagged from player table (mock)",
            status: "pending",
          },
          ...state.disputes,
        ],
      };
    case "BAN_PLAYER":
      return {
        ...state,
        playerStats: state.playerStats.map((p) =>
          p.username === action.username
            ? { ...p, username: `${p.username} (banned mock)` }
            : p
        ),
      };
    default:
      return state;
  }
}

interface CoinflipAdminContextValue extends State {
  removeActive: (id: string) => void;
  clearActive: () => void;
  resolveActive: (id: string) => void;
  addActive: (game: ActiveCoinflipGame) => void;
  addHistory: (row: CoinflipHistoryRow) => void;
  setDisputeStatus: (id: string, status: DisputeStatus) => void;
  setConfig: (p: Partial<CoinflipConfig>) => void;
  setRisk: (p: Partial<CoinflipRiskLimits>) => void;
  setPaused: (v: boolean) => void;
  setNewGamesDisabled: (v: boolean) => void;
  updatePlayer: (id: string, patch: Partial<PlayerCoinflipStat>) => void;
  flagPlayer: (username: string) => void;
  banPlayer: (username: string) => void;
}

const CoinflipAdminContext = createContext<CoinflipAdminContextValue | null>(
  null
);

export function CoinflipAdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<CoinflipAdminContextValue>(
    () => ({
      ...state,
      removeActive: (id) => dispatch({ type: "REMOVE_ACTIVE", id }),
      clearActive: () => dispatch({ type: "CLEAR_ACTIVE" }),
      resolveActive: (id) => dispatch({ type: "RESOLVE_ACTIVE", id }),
      addActive: (game) => dispatch({ type: "ADD_ACTIVE", game }),
      addHistory: (row) => dispatch({ type: "ADD_HISTORY", row }),
      setDisputeStatus: (id, status) =>
        dispatch({ type: "SET_DISPUTE_STATUS", id, status }),
      setConfig: (payload) => dispatch({ type: "SET_CONFIG", payload }),
      setRisk: (payload) => dispatch({ type: "SET_RISK", payload }),
      setPaused: (v) => dispatch({ type: "SET_PAUSED", v }),
      setNewGamesDisabled: (v) =>
        dispatch({ type: "SET_NEW_GAMES_DISABLED", v }),
      updatePlayer: (id, patch) =>
        dispatch({ type: "UPDATE_PLAYER", id, patch }),
      flagPlayer: (username) => dispatch({ type: "FLAG_PLAYER", username }),
      banPlayer: (username) => dispatch({ type: "BAN_PLAYER", username }),
    }),
    [state]
  );

  return (
    <CoinflipAdminContext.Provider value={value}>
      {children}
    </CoinflipAdminContext.Provider>
  );
}

export function useCoinflipAdmin() {
  const ctx = useContext(CoinflipAdminContext);
  if (!ctx) {
    throw new Error("useCoinflipAdmin must be used within CoinflipAdminProvider");
  }
  return ctx;
}
