import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAuthToken } from "@/lib/auth/verify-token";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const payload = await verifyAuthToken(token, secret);
    const email = typeof payload.email === "string" ? payload.email : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    return NextResponse.json({
      user: {
        id: payload.sub,
        email,
        role,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
