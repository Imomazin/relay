import { NextResponse } from "next/server";
import { desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { ensureSeeded } from "@/db/ready";
import { OPEN_INCIDENT_STATUSES } from "@/lib/domain";

export const dynamic = "force-dynamic";

/** Recent notifications + open-incident count for the header bell. */
export async function GET() {
  try {
    await ensureSeeded();
    const [items, openAgg] = await Promise.all([
      db.select().from(schema.notifications).orderBy(desc(schema.notifications.at)).limit(8),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.incidents)
        .where(inArray(schema.incidents.status, OPEN_INCIDENT_STATUSES)),
    ]);
    return NextResponse.json({
      ok: true,
      openIncidents: openAgg[0]?.count ?? 0,
      unread: items.filter((n) => !n.read).length,
      items: items.map((n) => ({ id: n.id, title: n.title, severity: n.severity, incidentId: n.incidentId, at: n.at })),
    });
  } catch {
    return NextResponse.json({ ok: false, openIncidents: 0, unread: 0, items: [] }, { status: 200 });
  }
}
