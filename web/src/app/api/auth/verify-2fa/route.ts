import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getAdminApiBaseUrl } from "@/lib/admin-api/base-url";
import { NextRequest, NextResponse } from "next/server";

type VerifyUpstreamBody = {
  accessToken?: string;
  expiresIn?: number;
  user?: { id: string; email: string; role: string };
};

export async function POST(request: NextRequest) {
  let body: { challengeId?: string; code?: string };
  try {
    body = (await request.json()) as { challengeId?: string; code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!challengeId || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "challengeId and a 6-digit code are required" },
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

  const upstream = await fetch(`${base}/auth/2fa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });

  const data = (await upstream.json().catch(() => ({}))) as VerifyUpstreamBody & {
    message?: string | string[];
    error?: string;
  };

  if (!upstream.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(", ")
          : data.error ?? "Verification failed";
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  const accessToken = data.accessToken;
  const expiresIn =
    typeof data.expiresIn === "number" && data.expiresIn > 0
      ? data.expiresIn
      : 900;

  if (!accessToken || !data.user) {
    return NextResponse.json(
      { error: "Unexpected response from auth service" },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ user: data.user });
  response.cookies.set(AUTH_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });

  return response;
}
