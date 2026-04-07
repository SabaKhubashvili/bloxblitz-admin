import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getAdminApiBaseUrl } from "@/lib/admin-api/base-url";
import { NextRequest, NextResponse } from "next/server";

type LoginUpstreamSuccess = {
  requiresTwoFactor?: boolean;
  challengeId?: string;
  expiresIn?: number;
  emailMasked?: string;
  accessToken?: string;
  user?: { id: string; email: string; role: string };
};

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
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

  const upstream = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await upstream.json().catch(() => ({}))) as LoginUpstreamSuccess & {
    message?: string | string[];
    error?: string;
  };

  if (!upstream.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(", ")
          : data.error ?? "Invalid email or password";
    return NextResponse.json({ error: message }, { status: upstream.status });
  }

  if (
    data.requiresTwoFactor === true &&
    typeof data.challengeId === "string" &&
    data.challengeId.length > 0
  ) {
    const expiresIn =
      typeof data.expiresIn === "number" && data.expiresIn > 0
        ? data.expiresIn
        : 300;
    return NextResponse.json({
      requiresTwoFactor: true,
      challengeId: data.challengeId,
      expiresIn,
      emailMasked:
        typeof data.emailMasked === "string" ? data.emailMasked : undefined,
    });
  }

  /* Legacy: single-step session (kept for forward-compat). */
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
