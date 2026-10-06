/**
 * Runtime self-provisioning guard.
 *
 * On platforms where the app has network access to Neon (e.g. Vercel), the
 * first data read auto-seeds the database when it looks unseeded, and
 * re-seeds when the synthetic data has gone stale (so SLA clocks, "events in
 * the last hour" and incident ages always read as a live operation rather than
 * a frozen snapshot). The deterministic seed regenerates all timestamps
 * relative to the current time, so a refresh re-bases the whole dataset to now.
 *
 * It is a no-op once seeded and fresh. Assumes schema/migrations are applied.
 */
import { sql } from "drizzle-orm";
import { db } from "./client";
import { applySeed } from "./apply";

/** Re-seed when the newest event is older than this (minutes). */
const STALE_AFTER_MINUTES = 360; // 6 hours

let readyPromise: Promise<void> | null = null;
let lastRun = 0;
/** Re-evaluate the seed/stale check at most this often (ms). */
const CHECK_INTERVAL_MS = 60_000;

/** Idempotent, time-gated. Safe at the top of any query; re-checks staleness
 *  periodically on long-lived servers rather than only once per process. */
export function ensureSeeded(): Promise<void> {
  const now = Date.now();
  if (readyPromise && now - lastRun < CHECK_INTERVAL_MS) return readyPromise;
  lastRun = now;
  readyPromise = provision();
  return readyPromise;
}

async function provision(): Promise<void> {
  if (process.env.RELAY_DISABLE_AUTOSEED === "1") return;
  try {
    const result = await db.execute<{ count: number; stale_min: number | null }>(
      sql`SELECT count(*)::int AS count,
                 extract(epoch FROM (now() - max(occurred_at)))/60 AS stale_min
          FROM events`,
    );
    const row = (result as { rows?: { count?: number; stale_min?: number | null }[] }).rows?.[0] ?? {};
    const count = Number(row.count ?? 0);
    const staleMin = row.stale_min == null ? Infinity : Number(row.stale_min);

    if (count >= 100 && staleMin <= STALE_AFTER_MINUTES) return; // seeded & fresh

    const reason = count < 100 ? `unseeded (events=${count})` : `stale (newest event ${Math.round(staleMin)}m old)`;
    console.log(`[relay] Database ${reason}; seeding...`);
    await applySeed(db);
    console.log("[relay] Seed complete.");
  } catch (err) {
    // Table missing → migrations not applied yet; surfaced via the error UI.
    console.error("[relay] Auto-seed skipped:", (err as Error).message);
  }
}
