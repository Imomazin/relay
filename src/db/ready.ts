/**
 * Runtime self-provisioning guard.
 *
 * On platforms where the app has network access to Neon (e.g. Vercel), the
 * first data read will auto-seed the database if it looks unseeded. This makes
 * the demonstrator work end-to-end from a single environment variable
 * (DATABASE_URL) without a manual seed step. It is a no-op once seeded.
 *
 * Assumes the schema/migrations have already been applied (see README).
 */
import { sql } from "drizzle-orm";
import { db } from "./client";
import { applySeed } from "./apply";

let readyPromise: Promise<void> | null = null;

async function provision(): Promise<void> {
  try {
    const result = await db.execute<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM events`,
    );
    // drizzle neon-http returns { rows }
    const count = Number((result as any).rows?.[0]?.count ?? 0);
    if (count >= 100) return; // already seeded
    if (process.env.RELAY_DISABLE_AUTOSEED === "1") return;
    console.log(`[relay] Database looks unseeded (events=${count}); seeding...`);
    await applySeed(db);
    console.log("[relay] Auto-seed complete.");
  } catch (err) {
    // If the table does not exist yet, migrations have not been applied.
    console.error("[relay] Auto-seed skipped:", (err as Error).message);
  }
}

/** Idempotent, memoised. Safe to call at the top of any data-access function. */
export function ensureSeeded(): Promise<void> {
  if (!readyPromise) readyPromise = provision();
  return readyPromise;
}
