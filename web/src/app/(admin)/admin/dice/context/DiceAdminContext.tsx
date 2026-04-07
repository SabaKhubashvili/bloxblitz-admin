"use client";

import {
  DEFAULT_DICE_CONFIG,
  DEFAULT_DICE_RISK,
  INITIAL_DICE_HISTORY,
  INITIAL_DICE_PLAYERS,
  INITIAL_LIVE_ROLLS,
} from "../mock/data";
import type {
  DiceGameConfig,
  DiceHistoryRow,
  DiceLiveRoll,
  DicePlayerStat,
  DiceRiskLimits,
} from "../mock/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

interface State {
  config: DiceGameConfig;
  risk: DiceRiskLimits;
  history: DiceHistoryRow[];
  playerStats: DicePlayerStat[];
  liveRolls: DiceLiveRoll[];
  systemPaused: boolean;
}

type Action =
  | { type: "SET_CONFIG"; payload: Partial<DiceGameConfig> }
  | { type: "SET_RISK"; payload: Partial<DiceRiskLimits> }
  | { type: "SET_PAUSED"; v: boolean }
  | { type: "SET_LIVE"; rolls: DiceLiveRoll[] }
  | { type: "SET_LIVE_FN"; fn: (prev: DiceLiveRoll[]) => DiceLiveRoll[] }
  | { type: "RESET_LIVE" }
  | { type: "ADD_LIVE"; roll: DiceLiveRoll }
  | { type: "ADD_HISTORY"; row: DiceHistoryRow }
  | { type: "BAN_PLAYER"; username: string }
  | { type: "LIMIT_PLAYER"; username: string };

const initialState: State = {
  config: { ...DEFAULT_DICE_CONFIG },
  risk: { ...DEFAULT_DICE_RISK },
  history: INITIAL_DICE_HISTORY.map((h) => ({ ...h })),
  playerStats: INITIAL_DICE_PLAYERS.map((p) => ({ ...p })),
  liveRolls: INITIAL_LIVE_ROLLS(),
  systemPaused: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_CONFIG":
      return { ...state, config: { ...state.config, ...action.payload } };
    case "SET_RISK":
      return { ...state, risk: { ...state.risk, ...action.payload } };
    case "SET_PAUSED":
      return { ...state, systemPaused: action.v };
    case "SET_LIVE":
      return { ...state, liveRolls: action.rolls };
    case "SET_LIVE_FN":
      return { ...state, liveRolls: action.fn(state.liveRolls) };
    case "RESET_LIVE":
      return { ...state, liveRolls: [] };
    case "ADD_LIVE":
      return { ...state, liveRolls: [action.roll, ...state.liveRolls] };
    case "ADD_HISTORY":
      return { ...state, history: [action.row, ...state.history] };
    case "BAN_PLAYER":
      return {
        ...state,
        playerStats: state.playerStats.map((p) =>
          p.username === action.username
            ? { ...p, username: `${p.username} (banned)` }
            : p
        ),
      };
    case "LIMIT_PLAYER":
      return {
        ...state,
        playerStats: state.playerStats.map((p) =>
          p.username === action.username
            ? { ...p, riskProfile: "low" as const }
            : p
        ),
      };
    default:
      return state;
  }
}

type Ctx = {
  state: State;
  dispatch: React.Dispatch<Action>;
  config: DiceGameConfig;
  setConfig: (p: Partial<DiceGameConfig>) => void;
  risk: DiceRiskLimits;
  setRisk: (p: Partial<DiceRiskLimits>) => void;
  history: DiceHistoryRow[];
  playerStats: DicePlayerStat[];
  liveRolls: DiceLiveRoll[];
  systemPaused: boolean;
  updateLiveRolls: (fn: (prev: DiceLiveRoll[]) => DiceLiveRoll[]) => void;
};

const DiceAdminContext = createContext<Ctx | null>(null);

export function DiceAdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setConfig = useCallback((p: Partial<DiceGameConfig>) => {
    dispatch({ type: "SET_CONFIG", payload: p });
  }, []);

  const setRisk = useCallback((p: Partial<DiceRiskLimits>) => {
    dispatch({ type: "SET_RISK", payload: p });
  }, []);

  const updateLiveRolls = useCallback(
    (fn: (prev: DiceLiveRoll[]) => DiceLiveRoll[]) => {
      dispatch({ type: "SET_LIVE_FN", fn });
    },
    []
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      dispatch,
      config: state.config,
      setConfig,
      risk: state.risk,
      setRisk,
      history: state.history,
      playerStats: state.playerStats,
      liveRolls: state.liveRolls,
      systemPaused: state.systemPaused,
      updateLiveRolls,
    }),
    [state, setConfig, setRisk, updateLiveRolls]
  );

  return (
    <DiceAdminContext.Provider value={value}>{children}</DiceAdminContext.Provider>
  );
}

export function useDiceAdmin() {
  const ctx = useContext(DiceAdminContext);
  if (!ctx) {
    throw new Error("useDiceAdmin must be used within DiceAdminProvider");
  }
  return ctx;
}
