import { adminApiClientFetch } from "./client-fetch";

export type CrashControlRoomRange = "24h" | "7d" | "30d";

export type CrashStatisticsOverview = {
  range: CrashControlRoomRange;
  totalWagered: number;
  totalPayout: number;
  profitLoss: number;
  activePlayers: number;
  totalBets: number;
};

export type CrashMultiplierHistoryEntry = {
  roundId: string;
  crashMultiplier: number;
  createdAt: string;
};

export type CrashProfitLossChartPoint = {
  time: string;
  profit: number;
  loss: number;
};

export type CrashPlayerActivityChartPoint = {
  time: string;
  activePlayers: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCrashControlOverview(
  range: CrashControlRoomRange,
): Promise<CrashStatisticsOverview> {
  const q = new URLSearchParams({ range });
  const res = await adminApiClientFetch(
    `/admin/crash/control-room/overview?${q}`,
  );
  return parseJson(res);
}

export async function fetchCrashMultiplierHistory(): Promise<
  CrashMultiplierHistoryEntry[]
> {
  const res = await adminApiClientFetch(
    "/admin/crash/control-room/multiplier-history",
  );
  return parseJson(res);
}

export async function fetchCrashProfitLossChart(): Promise<
  CrashProfitLossChartPoint[]
> {
  const res = await adminApiClientFetch(
    "/admin/crash/control-room/profit-loss-chart",
  );
  return parseJson(res);
}

export async function fetchCrashPlayerActivityChart(): Promise<
  CrashPlayerActivityChartPoint[]
> {
  const res = await adminApiClientFetch(
    "/admin/crash/control-room/player-activity-chart",
  );
  return parseJson(res);
}

/** Redis-backed global Crash flags (`bb:crash:runtime:*`). */
export type CrashRuntimeState = {
  paused: boolean;
  betsDisabled: boolean;
};

export async function fetchCrashRuntimeState(): Promise<CrashRuntimeState> {
  const res = await adminApiClientFetch("/admin/crash/control-room/runtime");
  return parseJson(res);
}

async function postCrashRuntime(path: string): Promise<CrashRuntimeState> {
  const res = await adminApiClientFetch(path, { method: "POST" });
  return parseJson(res);
}

export function postCrashPauseGame(): Promise<CrashRuntimeState> {
  return postCrashRuntime("/admin/crash/control-room/runtime/pause");
}

export function postCrashResumeGame(): Promise<CrashRuntimeState> {
  return postCrashRuntime("/admin/crash/control-room/runtime/resume");
}

export function postCrashDisableBets(): Promise<CrashRuntimeState> {
  return postCrashRuntime("/admin/crash/control-room/runtime/disable-bets");
}

export function postCrashEnableBets(): Promise<CrashRuntimeState> {
  return postCrashRuntime("/admin/crash/control-room/runtime/enable-bets");
}
