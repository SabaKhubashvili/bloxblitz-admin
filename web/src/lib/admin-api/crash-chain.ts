import { adminApiClientFetch } from "./client-fetch";

/** Default block from `BloxBlitz_Amp/api/scripts/setup-crash-chain.ts` (testing). */
export const CRASH_SETUP_DEFAULT_BLOCK_HASH =
  "0000000000000000001b34dc6a1e86083f95500b096231436e9b25cbdd0075c4";

export type CrashChainRow = {
  id: string;
  chainId: string;
  gameType: string;
  finalHash: string;
  totalRounds: number;
  currentRound: number;
  isActive: boolean;
  isComplete: boolean;
  clientSeed: string | null;
  clientSeedSetAt: string | null;
  createdAt: string;
  completedAt: string | null;
  serverSeedPreview: string;
  precalculatedRounds: number;
  needsClientSeed: boolean;
};

export type CrashChainDetail = CrashChainRow & {
  serverSeed: string;
};

export type CreateCrashChainResponse = {
  chain: CrashChainDetail;
  notice: string;
};

export type CrashChainStatistics = {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  distribution: {
    label: string;
    min: number;
    max: number;
    count: number;
  }[];
};

export type PrecalculateCrashResponse = {
  startRound: number;
  endRound: number;
  inserted: number;
};

export type CrashChainPreset = "production" | "test";

async function readResponseText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * Nest/upstream may send 204 or an empty body for “no value”; `res.json()` then throws
 * `JSON.parse: unexpected end of data`. Always read text first.
 */
async function parseJsonRequired<T>(res: Response): Promise<T> {
  const text = await readResponseText(res);
  if (!res.ok) {
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`Empty response from admin-api (${res.status})`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse error";
    throw new Error(
      `Invalid JSON from admin-api (${res.status}): ${msg}. Body preview: ${trimmed.slice(0, 200)}`,
    );
  }
}

/** For endpoints where null / no body means “no active row” (e.g. GET …/chains/active). */
async function parseJsonNullable<T>(res: Response): Promise<T | null> {
  const text = await readResponseText(res);
  if (res.status === 204) {
    return null;
  }
  if (!res.ok) {
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  const trimmed = text.trim();
  if (!trimmed || trimmed === "null") {
    return null;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse error";
    throw new Error(
      `Invalid JSON from admin-api (${res.status}): ${msg}. Body preview: ${trimmed.slice(0, 200)}`,
    );
  }
}

export async function fetchCrashChains(
  limit = 50,
): Promise<CrashChainRow[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await adminApiClientFetch(`/admin/crash/chains?${q}`);
  return parseJsonRequired(res);
}

export async function fetchCrashChainActive(): Promise<CrashChainRow | null> {
  const res = await adminApiClientFetch("/admin/crash/chains/active");
  return parseJsonNullable(res);
}

export async function fetchCrashChainStatistics(): Promise<CrashChainStatistics | null> {
  const res = await adminApiClientFetch(
    "/admin/crash/chains/active/statistics",
  );
  const text = await readResponseText(res);
  if (res.status === 400 || res.status === 204) {
    return null;
  }
  if (!res.ok) {
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  const trimmed = text.trim();
  if (!trimmed || trimmed === "null") {
    return null;
  }
  try {
    return JSON.parse(trimmed) as CrashChainStatistics;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse error";
    throw new Error(
      `Invalid JSON from admin-api (${res.status}): ${msg}. Body preview: ${trimmed.slice(0, 200)}`,
    );
  }
}

export async function fetchCrashChainById(
  chainId: string,
): Promise<CrashChainDetail> {
  const enc = encodeURIComponent(chainId);
  const res = await adminApiClientFetch(`/admin/crash/chains/${enc}`);
  return parseJsonRequired(res);
}

/** Mirrors script menus 1 & 2; omit both preset and totalRounds for 10k test default. */
export async function postCreateCrashChain(body: {
  preset?: CrashChainPreset;
  totalRounds?: number;
}): Promise<CreateCrashChainResponse> {
  const res = await adminApiClientFetch("/admin/crash/chains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJsonRequired(res);
}

/** Same as script `setClientSeed`: 64 hex, only when chain still has no client seed; activates chain. */
export async function patchCrashChainClientSeed(
  chainId: string,
  clientSeed: string,
): Promise<CrashChainDetail> {
  const enc = encodeURIComponent(chainId);
  const res = await adminApiClientFetch(
    `/admin/crash/chains/${enc}/client-seed`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientSeed }),
    },
  );
  return parseJsonRequired(res);
}

export async function postPrecalculateCrashRounds(
  count: number,
): Promise<PrecalculateCrashResponse> {
  const res = await adminApiClientFetch("/admin/crash/chains/precalculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count }),
  });
  return parseJsonRequired(res);
}
