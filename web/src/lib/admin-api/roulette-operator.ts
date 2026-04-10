import { adminApiClientFetch } from "./client-fetch";

export type RouletteOperatorStateResponse = {
  available: boolean;
  state: unknown | null;
  fetchedAt: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  let message = res.statusText;
  try {
    const body = (await res.json()) as {
      message?: string | string[];
    };
    if (Array.isArray(body.message)) message = body.message.join(", ");
    else if (typeof body.message === "string") message = body.message;
  } catch {
    try {
      message = await res.text();
    } catch {
      /* ignore */
    }
  }
  return message || `Request failed (${res.status})`;
}

export async function fetchRouletteOperatorState(
  init?: RequestInit,
): Promise<RouletteOperatorStateResponse> {
  const res = await adminApiClientFetch(
    "/admin/roulette/operator/state",
    init,
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<RouletteOperatorStateResponse>;
}
