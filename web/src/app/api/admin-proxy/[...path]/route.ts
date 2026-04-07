import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getAdminApiBaseUrl } from "@/lib/admin-api/base-url";
import { isAdminProxyPathAllowed } from "@/lib/admin-proxy-allowlist";
import { NextRequest, NextResponse } from "next/server";

/** Node fetch requires `duplex: "half"` when forwarding a streamed request body (e.g. multipart). */
export const runtime = "nodejs";

async function proxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) {
  const { path: segments } = await params;
  if (!isAdminProxyPathAllowed(segments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let base: string;
  try {
    base = getAdminApiBaseUrl();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const targetPath = segments.join("/");
  const url = new URL(`${base}/${targetPath}`);
  request.nextUrl.searchParams.forEach((v, k) => {
    url.searchParams.set(k, v);
  });

  const headers = new Headers();
  const skip = new Set(["host", "connection", "content-length"]);
  request.headers.forEach((value, key) => {
    if (!skip.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set("Authorization", `Bearer ${token}`);

  const hasBody = !["GET", "HEAD"].includes(method);
  const reqBody = hasBody ? request.body : null;

  const fetchInit: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };
  if (reqBody) {
    fetchInit.body = reqBody;
    fetchInit.duplex = "half";
  }

  const upstream = await fetch(url.toString(), fetchInit);

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("transfer-encoding");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

export function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, ctx.params, "GET");
}

export function POST(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, ctx.params, "POST");
}

export function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, ctx.params, "PUT");
}

export function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, ctx.params, "PATCH");
}

export function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, ctx.params, "DELETE");
}
