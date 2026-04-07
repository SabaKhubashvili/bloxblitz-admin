import { adminApiClientFetch } from "./client-fetch";

export type BulkCasesStatusResponse = {
  success: true;
  updatedCount: number;
};

async function postBulkStatus(
  path: "/admin/cases/enable-all" | "/admin/cases/disable-all",
): Promise<BulkCasesStatusResponse> {
  const res = await adminApiClientFetch(path, { method: "POST" });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (typeof body.message === "string") message = body.message;
    } catch {
      try {
        message = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<BulkCasesStatusResponse>;
}

export function enableAllCases(): Promise<BulkCasesStatusResponse> {
  return postBulkStatus("/admin/cases/enable-all");
}

export function disableAllCases(): Promise<BulkCasesStatusResponse> {
  return postBulkStatus("/admin/cases/disable-all");
}
