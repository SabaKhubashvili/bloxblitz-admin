import axios from "axios";
import type { DiceGameConfig } from "@/app/(admin)/admin/dice/mock/types";
import { adminApiAxios } from "./admin-axios";

/** API / Redis field names (matches admin-api). */
export type DiceConfigApi = {
  minBet: number;
  maxBet: number;
  houseEdge: number;
  rtpTarget: number;
  maxPayoutMultiplier: number;
};

export const DEFAULT_DICE_CONFIG_API: DiceConfigApi = {
  minBet: 0.1,
  maxBet: 3000,
  houseEdge: 1.5,
  rtpTarget: 97,
  maxPayoutMultiplier: 1000,
};

const API_KEYS: (keyof DiceConfigApi)[] = [
  "minBet",
  "maxBet",
  "houseEdge",
  "rtpTarget",
  "maxPayoutMultiplier",
];

export function normalizeDiceConfigPayload(raw: unknown): DiceConfigApi {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_DICE_CONFIG_API };
  }
  const o = raw as Record<string, unknown>;
  const pick = (key: keyof DiceConfigApi, fallback: number) => {
    const v = o[key];
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    minBet: pick("minBet", DEFAULT_DICE_CONFIG_API.minBet),
    maxBet: pick("maxBet", DEFAULT_DICE_CONFIG_API.maxBet),
    houseEdge: pick("houseEdge", DEFAULT_DICE_CONFIG_API.houseEdge),
    rtpTarget: pick("rtpTarget", DEFAULT_DICE_CONFIG_API.rtpTarget),
    maxPayoutMultiplier: pick(
      "maxPayoutMultiplier",
      DEFAULT_DICE_CONFIG_API.maxPayoutMultiplier,
    ),
  };
}

export function diceConfigApiToForm(api: DiceConfigApi): DiceGameConfig {
  return {
    minBet: api.minBet,
    maxBet: api.maxBet,
    minRoll: 0,
    maxRoll: 100,
    houseEdgePercent: api.houseEdge,
    rtpTarget: api.rtpTarget,
    maxPayoutMultiplier: api.maxPayoutMultiplier,
  };
}

export function diceFormToApiShape(draft: DiceGameConfig): DiceConfigApi {
  return {
    minBet: draft.minBet,
    maxBet: draft.maxBet,
    houseEdge: draft.houseEdgePercent,
    rtpTarget: draft.rtpTarget,
    maxPayoutMultiplier: draft.maxPayoutMultiplier,
  };
}

export function buildDiceConfigPatch(
  saved: DiceConfigApi,
  draft: DiceGameConfig,
): Partial<DiceConfigApi> {
  const next = diceFormToApiShape(draft);
  const patch: Partial<DiceConfigApi> = {};
  for (const k of API_KEYS) {
    if (next[k] !== saved[k]) {
      patch[k] = next[k];
    }
  }
  return patch;
}

export function axiosErrorMessage(e: unknown): string {
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
    e.message ||
    `Request failed (${e.response?.status ?? "?"})`
  );
}

export async function getDiceConfigWithAxios(): Promise<DiceConfigApi> {
  try {
    const { data } = await adminApiAxios.get<unknown>("admin/dice/config");
    return normalizeDiceConfigPayload(data);
  } catch {
    return { ...DEFAULT_DICE_CONFIG_API };
  }
}

export async function patchDiceConfigWithAxios(
  patch: Partial<DiceConfigApi>,
): Promise<DiceConfigApi> {
  try {
    const { data } = await adminApiAxios.post<unknown>(
      "admin/dice/config",
      patch,
    );
    return normalizeDiceConfigPayload(data);
  } catch (e) {
    throw new Error(axiosErrorMessage(e));
  }
}
