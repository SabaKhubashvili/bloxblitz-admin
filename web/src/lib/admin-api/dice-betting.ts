import { adminApiAxios } from "./admin-axios";

export type DiceBettingStatusResponse = {
  bettingDisabled: boolean;
};

export async function fetchDiceBettingStatus(): Promise<DiceBettingStatusResponse> {
  const { data } = await adminApiAxios.get<DiceBettingStatusResponse>(
    "admin/dice/betting/status",
  );
  return data;
}

export async function disableDiceBetting(): Promise<DiceBettingStatusResponse> {
  const { data } = await adminApiAxios.post<DiceBettingStatusResponse>(
    "admin/dice/betting/disable",
  );
  return data;
}

export async function enableDiceBetting(): Promise<DiceBettingStatusResponse> {
  const { data } = await adminApiAxios.post<DiceBettingStatusResponse>(
    "admin/dice/betting/enable",
  );
  return data;
}
