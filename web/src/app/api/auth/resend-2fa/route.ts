import { getAdminApiBaseUrl } from "@/lib/admin-api/base-url";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: { challengeId?: string };
  try {
    body = (await request.json()) as { challengeId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId.trim() : "";
  if (!challengeId) {
    return NextResponse.json(
      { error: "challengeId is required" },
      { status: 400 },
    );
  }

  let base: string;
  try {
    base = getAdminApiBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const upstream = await fetch(`${base}/auth/2fa/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });

  const data = (await upstream.json().catch(() => ({}))) as {
    ok?: boolean;
    expiresIn?: number;
    message?: string | string[];
    error?: string;
    retryAfterSeconds?: number;
  };

  if (!upstream.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(", ")
          : data.error ?? "Could not resend code";
    return NextResponse.json(
      {
        error: message,
        retryAfterSeconds:
          typeof data.retryAfterSeconds === "number"
            ? data.retryAfterSeconds
            : undefined,
      },
      { status: upstream.status },
    );
  }

  const expiresIn =
    typeof data.expiresIn === "number" && data.expiresIn > 0
      ? data.expiresIn
      : 300;

  return NextResponse.json({ ok: true, expiresIn });
}
