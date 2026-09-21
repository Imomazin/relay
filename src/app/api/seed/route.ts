import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { applySeed } from "@/db/apply";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manually (re)seed the database. Guarded by the SEED_TOKEN environment
 * variable — provide it as `?token=...` or an `x-seed-token` header. If
 * SEED_TOKEN is unset the endpoint is disabled (returns 404) to avoid an open
 * write endpoint in the public deployment.
 */
export async function POST(request: Request) {
  const expected = process.env.SEED_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "Seeding endpoint disabled (SEED_TOKEN not set)." }, { status: 404 });
  }
  const url = new URL(request.url);
  const provided = url.searchParams.get("token") ?? request.headers.get("x-seed-token");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorised." }, { status: 401 });
  }
  try {
    const counts = await applySeed(db);
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
