import { adminApiClientFetch } from "./client-fetch";

export type MinesSystemMode = "ACTIVE" | "NEW_GAMES_DISABLED" | "PAUSED";

export type MinesSystemStateResponse = {
  mode: MinesSystemMode;
  systemPaused: boolean;
  newGamesDisabled: boolean;
};

export type MinesResetActiveResponse = {
  modeAfter: string;
  gamesProcessed: number;
  gamesCredited: number;
  games: Array<{
    gameId: string;
    username: string;
    grossCredit: number;
    credited: boolean;
    redisCleaned: boolean;
    dbUpdated: boolean;
    skippedReason?: string;
  }>;
};

async function readErrorMessage(res: Response): Promise<string> {
  let message = res.statusText;
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(body.message)) message = body.message.join(", ");
    else if (typeof body.message === "string") message = body.message;
    else if (typeof body.error === "string" && body.error.length > 0) {
      message = body.message
        ? String(body.message)
        : `${body.error} (${res.status})`;
    }
  } catch {
    try {
      message = await res.text();
    } catch {
      /* ignore */
    }
  }
  return message || `Request failed (${res.status})`;
}

export async function fetchMinesSystemState(
  init?: RequestInit,
): Promise<MinesSystemStateResponse> {
  const res = await adminApiClientFetch("/admin/mines/system-state", init);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<MinesSystemStateResponse>;
}

async function postVoid(path: string, init?: RequestInit): Promise<void> {
  const res = await adminApiClientFetch(path, {
    ...init,
    method: "POST",
    headers: {
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  await res.json().catch(() => {});
}

export async function postMinesPause(init?: RequestInit): Promise<void> {
  return postVoid("/admin/mines/pause", init);
}

export async function postMinesResume(init?: RequestInit): Promise<void> {
  return postVoid("/admin/mines/resume", init);
}

export async function postMinesToggleNewGames(init?: RequestInit): Promise<void> {
  return postVoid("/admin/mines/toggle-new-games", init);
}

export async function postMinesResetActive(
  init?: RequestInit,
): Promise<MinesResetActiveResponse> {
  const res = await adminApiClientFetch("/admin/mines/reset-active", {
    ...init,
    method: "POST",
    headers: {
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<MinesResetActiveResponse>;
}
