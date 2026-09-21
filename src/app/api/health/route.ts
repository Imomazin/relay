import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

/** Lightweight health check: confirms the database is reachable and seeded. */
export async function GET() {
  try {
    const result = await db.execute<{ services: number; events: number; incidents: number }>(sql`
      SELECT
        (SELECT count(*) FROM services)::int AS services,
        (SELECT count(*) FROM events)::int AS events,
        (SELECT count(*) FROM incidents)::int AS incidents
    `);
    const row = (result as any).rows?.[0] ?? {};
    return NextResponse.json({ ok: true, database: "connected", counts: row, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, database: "unreachable", error: (err as Error).message },
      { status: 503 },
    );
  }
}
