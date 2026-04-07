import axios from "axios";
import { adminApiAxios } from "./admin-axios";

export type RaceRewardTierApi = {
  position: number;
  rewardAmount: number;
};

export type RaceOverviewActiveApi = {
  id: string;
  prizePool: number;
  totalWagered: number;
  participants: number;
  timeLeft: number;
  startTime: string;
  endTime: string;
  status: "active" | "paused";
  trackingPaused: boolean;
  raceWindow: "24h" | "7d" | "custom";
  rewardTiers: RaceRewardTierApi[];
};

export type RaceOverviewTopEntryApi = {
  username: string;
  wagered: number;
  rank: number;
};

export type RaceOverviewNextApi = {
  id: string;
  prizePool: number;
  startTime: string;
  endTime: string;
  rewardTiers: RaceRewardTierApi[];
};

export type RaceOverviewResponse = {
  activeRace: RaceOverviewActiveApi | null;
  top10: RaceOverviewTopEntryApi[];
  nextRace?: RaceOverviewNextApi;
};

export type RaceHistoryWinnerApi = {
  username: string;
  wagered: number;
  rank: number;
};

export type RaceHistoryItemApi = {
  id: string;
  prizePool: number;
  totalWagered: number;
  participants: number;
  startTime: string;
  endTime: string;
  status: "completed" | "cancelled";
  winners: RaceHistoryWinnerApi[];
};

export type RaceHistoryResponse = {
  races: RaceHistoryItemApi[];
};

export async function fetchRaceOverview(): Promise<RaceOverviewResponse> {
  const { data } = await adminApiAxios.get<RaceOverviewResponse>(
    "admin/races/overview",
  );
  return data;
}

export async function fetchRaceHistory(
  limit = 20,
): Promise<RaceHistoryResponse> {
  const { data } = await adminApiAxios.get<RaceHistoryResponse>(
    "admin/races/history",
    { params: { limit } },
  );
  return data;
}

export type CreateRaceBody = {
  rewards: Array<{ position: number; rewardAmount: number }>;
  startTime: string;
  endTime: string;
  raceWindow?: "24h" | "7d" | "custom";
};

export async function createRaceApi(
  body: CreateRaceBody,
): Promise<{ id: string }> {
  const { data } = await adminApiAxios.post<{ id: string }>(
    "admin/races",
    body,
  );
  return data;
}

async function postNoContent(path: string): Promise<void> {
  await adminApiAxios.post(path, {});
}

export function raceActionPath(id: string, action: string): string {
  return `admin/races/${encodeURIComponent(id)}/${action}`;
}

export async function postRaceEnd(id: string): Promise<void> {
  await postNoContent(raceActionPath(id, "end"));
}

export async function postRaceCancel(id: string): Promise<void> {
  await postNoContent(raceActionPath(id, "cancel"));
}

export async function postRacePause(id: string): Promise<void> {
  await postNoContent(raceActionPath(id, "pause"));
}

export async function postRaceResume(id: string): Promise<void> {
  await postNoContent(raceActionPath(id, "resume"));
}

export async function postRacePauseTracking(id: string): Promise<void> {
  await postNoContent(raceActionPath(id, "pause-tracking"));
}

export async function postRaceResumeTracking(id: string): Promise<void> {
  await postNoContent(raceActionPath(id, "resume-tracking"));
}

export function racesAxiosErrorMessage(e: unknown): string {
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
