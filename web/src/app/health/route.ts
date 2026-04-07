import { NextResponse } from "next/server";

/** Liveness/readiness for orchestrators and Docker HEALTHCHECK (no auth). */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
