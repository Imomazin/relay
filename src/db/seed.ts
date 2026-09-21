/**
 * Deterministic seed CLI for the Relay demonstrator.
 *
 * Runs the real normalisation / correlation / triage / runbook engines over a
 * set of synthetic incident scenarios (see src/db/seed-data.ts) so the seeded
 * database is internally consistent with the running application. Re-running
 * produces identical data (fixed PRNG seed).
 *
 * Usage: `npm run db:seed` (requires network access to Neon).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { applySeed } from "./apply";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — cannot seed.");
  const db = drizzle(neon(url), { schema });

  console.log("→ Seeding Relay database...");
  const counts = await applySeed(db);
  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ✓ ${table}: ${n}`);
  }
  console.log("✓ Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  });
