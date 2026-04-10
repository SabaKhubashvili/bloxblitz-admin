import axios from "axios";
import { adminApiAxios } from "./admin-axios";

export type RouletteConfigApi = {
  minBet: number;
  maxBet: number;
  gameEnabled: boolean;
  bettingEnabled: boolean;
};

export const DEFAULT_ROULETTE_CONFIG_API: RouletteConfigApi = {
  minBet: 0.01,
  maxBet: 5000,
  gameEnabled: true,
  bettingEnabled: true,
};

const API_KEYS: (keyof RouletteConfigApi)[] = [
  "minBet",
  "maxBet",
  "gameEnabled",
  "bettingEnabled",
];

export function normalizeRouletteConfigPayload(raw: unknown): RouletteConfigApi {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ROULETTE_CONFIG_API };
  }
  const o = raw as Record<string, unknown>;
  const pickNum = (key: "minBet" | "maxBet", fallback: number) => {
    const v = o[key];
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const pickBool = (key: "gameEnabled" | "bettingEnabled", fallback: boolean) => {
    const v = o[key];
    if (typeof v === "boolean") return v;
    if (v === "1" || v === 1 || v === "true") return true;
    if (v === "0" || v === 0 || v === "false") return false;
    return fallback;
  };
  return {
    minBet: pickNum("minBet", DEFAULT_ROULETTE_CONFIG_API.minBet),
    maxBet: pickNum("maxBet", DEFAULT_ROULETTE_CONFIG_API.maxBet),
    gameEnabled: pickBool("gameEnabled", DEFAULT_ROULETTE_CONFIG_API.gameEnabled),
    bettingEnabled: pickBool(
      "bettingEnabled",
      DEFAULT_ROULETTE_CONFIG_API.bettingEnabled,
    ),
  };
}

export function buildRouletteConfigPatch(
  saved: RouletteConfigApi,
  draft: RouletteConfigApi,
): Partial<RouletteConfigApi> {
  const patch: Partial<RouletteConfigApi> = {};
  const out = patch as Record<keyof RouletteConfigApi, number | boolean>;
  for (const k of API_KEYS) {
    if (draft[k] !== saved[k]) {
      out[k] = draft[k];
    }
  }
  return patch;
}

function axiosErrorMessage(e: unknown): string {
  if (!axios.isAxiosError(e)) {
    return e instanceof Error ? e.message : "Request failed";
  }
  const d = e.response?.data;
  if (d && typeof d === "object" && "message" in d) {
    const m = (d as { message: unknown }).message;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) return m.join(", ");
  }
  return (
    e.message || `Request failed (${e.response?.status ?? "?"})`
  );
}

export async function getRouletteConfigWithAxios(): Promise<RouletteConfigApi> {
  try {
    const { data } = await adminApiAxios.get<unknown>("admin/roulette/config");
    return normalizeRouletteConfigPayload(data);
  } catch {
    return { ...DEFAULT_ROULETTE_CONFIG_API };
  }
}

export async function postRouletteConfigWithAxios(
  patch: Partial<RouletteConfigApi>,
): Promise<RouletteConfigApi> {
  try {
    const { data } = await adminApiAxios.post<unknown>(
      "admin/roulette/config",
      patch,
    );
    return normalizeRouletteConfigPayload(data);
  } catch (e) {
    throw new Error(axiosErrorMessage(e));
  }
}
