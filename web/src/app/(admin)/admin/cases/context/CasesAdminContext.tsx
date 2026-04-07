"use client";

import { INITIAL_CASES } from "../mock/data";
import type {
  CaseLimitsState,
  CaseRecord,
  CaseStatus,
} from "../mock/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

const defaultLimits: CaseLimitsState = {
  maxOpensPerUserDay: 50,
  maxTotalOpensGlobal: 500_000,
  cooldownSeconds: 3,
  limitsEnabled: true,
  cooldownEnabled: true,
};

type Action =
  | { type: "UPSERT_CASE"; payload: CaseRecord }
  | { type: "DELETE_CASE"; id: string }
  | { type: "TOGGLE_CASE"; id: string }
  | { type: "SET_ALL_STATUS"; status: CaseStatus }
  | { type: "RESET_STATS" }
  | { type: "SET_LIMITS"; payload: Partial<CaseLimitsState> }
  | { type: "BUMP_CASES_LIST_VERSION" };

interface State {
  cases: CaseRecord[];
  limits: CaseLimitsState;
  /** Incremented so CasesListSection refetches from admin-api. */
  casesListVersion: number;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "UPSERT_CASE": {
      const exists = state.cases.some((c) => c.id === action.payload.id);
      if (exists) {
        return {
          ...state,
          cases: state.cases.map((c) =>
            c.id === action.payload.id ? action.payload : c
          ),
        };
      }
      return {
        ...state,
        cases: [action.payload, ...state.cases],
      };
    }
    case "DELETE_CASE":
      return {
        ...state,
        cases: state.cases.filter((c) => c.id !== action.id),
      };
    case "TOGGLE_CASE":
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.id
            ? {
                ...c,
                status: c.status === "active" ? "disabled" : "active",
              }
            : c
        ),
      };
    case "SET_ALL_STATUS":
      return {
        ...state,
        cases: state.cases.map((c) => ({ ...c, status: action.status })),
      };
    case "RESET_STATS":
      return {
        ...state,
        cases: state.cases.map((c) => ({ ...c, totalOpened: 0 })),
      };
    case "SET_LIMITS":
      return {
        ...state,
        limits: { ...state.limits, ...action.payload },
      };
    case "BUMP_CASES_LIST_VERSION":
      return {
        ...state,
        casesListVersion: state.casesListVersion + 1,
      };
    default:
      return state;
  }
}

interface CasesAdminContextValue {
  cases: CaseRecord[];
  limits: CaseLimitsState;
  upsertCase: (c: CaseRecord) => void;
  deleteCase: (id: string) => void;
  toggleCase: (id: string) => void;
  setAllStatus: (status: CaseStatus) => void;
  resetStats: () => void;
  setLimits: (p: Partial<CaseLimitsState>) => void;
  bumpCasesListVersion: () => void;
  casesListVersion: number;
}

const CasesAdminContext = createContext<CasesAdminContextValue | null>(null);

export function CasesAdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    cases: INITIAL_CASES.map((c) => ({
      ...c,
      items: c.items.map((i) => ({ ...i })),
    })),
    limits: { ...defaultLimits },
    casesListVersion: 0,
  });

  const upsertCase = useCallback((c: CaseRecord) => {
    dispatch({ type: "UPSERT_CASE", payload: c });
  }, []);

  const deleteCase = useCallback((id: string) => {
    dispatch({ type: "DELETE_CASE", id });
  }, []);

  const toggleCase = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_CASE", id });
  }, []);

  const setAllStatus = useCallback((status: CaseStatus) => {
    dispatch({ type: "SET_ALL_STATUS", status });
  }, []);

  const resetStats = useCallback(() => {
    dispatch({ type: "RESET_STATS" });
  }, []);

  const setLimits = useCallback((payload: Partial<CaseLimitsState>) => {
    dispatch({ type: "SET_LIMITS", payload });
  }, []);

  const bumpCasesListVersion = useCallback(() => {
    dispatch({ type: "BUMP_CASES_LIST_VERSION" });
  }, []);

  const value = useMemo(
    () => ({
      cases: state.cases,
      limits: state.limits,
      casesListVersion: state.casesListVersion,
      upsertCase,
      deleteCase,
      toggleCase,
      setAllStatus,
      resetStats,
      setLimits,
      bumpCasesListVersion,
    }),
    [
      state.cases,
      state.limits,
      state.casesListVersion,
      upsertCase,
      deleteCase,
      toggleCase,
      setAllStatus,
      resetStats,
      setLimits,
      bumpCasesListVersion,
    ]
  );

  return (
    <CasesAdminContext.Provider value={value}>
      {children}
    </CasesAdminContext.Provider>
  );
}

export function useCasesAdmin() {
  const ctx = useContext(CasesAdminContext);
  if (!ctx) {
    throw new Error("useCasesAdmin must be used within CasesAdminProvider");
  }
  return ctx;
}
