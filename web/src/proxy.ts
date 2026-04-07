import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAuthToken } from "@/lib/auth/verify-token";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isPublicPath(pathname: string): boolean {
  const p = normalizePathname(pathname);
  if (p === "/signin" || p.startsWith("/signin/")) return true;
  if (p === "/reset-password" || p.startsWith("/reset-password/"))
    return true;
  if (p === "/error-404" || p.startsWith("/error-404/")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;

  if (isPublicPath(pathname)) {
    const onSignIn =
      normalizePathname(pathname) === "/signin" ||
      pathname.startsWith("/signin/");
    if (onSignIn && token && secret) {
      try {
        await verifyAuthToken(token, secret);
        return NextResponse.redirect(new URL("/", request.url));
      } catch {
        const res = NextResponse.next();
        res.cookies.delete(AUTH_COOKIE_NAME);
        return res;
      }
    }
    return NextResponse.next();
  }

  if (!token || !secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("reason", "unauthenticated");
    return NextResponse.redirect(url);
  }

  try {
    await verifyAuthToken(token, secret);
    return NextResponse.next();
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("reason", "session_expired");
    const res = NextResponse.redirect(url);
    res.cookies.delete(AUTH_COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
