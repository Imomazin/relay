/**
 * Applies a generated seed to the database via the Drizzle client.
 * Shared by the CLI seed script and the runtime self-provisioning guard.
 */
import { sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { generateSeed, SEED_TABLE_ORDER } from "./seed-data";

type Db = NeonHttpDatabase<typeof schema>;

export async function applySeed(db: Db): Promise<Record<string, number>> {
  const data = generateSeed();

  await db.execute(sql`TRUNCATE TABLE
    ${schema.notifications}, ${schema.resourceScenarios}, ${schema.capacityForecasts},
    ${schema.serviceMetrics}, ${schema.auditEvents}, ${schema.approvals},
    ${schema.automationExecutions}, ${schema.runbookSteps}, ${schema.runbooks},
    ${schema.triageDecisions}, ${schema.incidentEvents}, ${schema.events},
    ${schema.incidents}, ${schema.integrations}, ${schema.serviceDependencies},
    ${schema.services}
    RESTART IDENTITY CASCADE`);

  const counts: Record<string, number> = {};
  for (const { key } of SEED_TABLE_ORDER) {
    const rows = data[key] as unknown[];
    counts[key] = rows.length;
    if (rows.length === 0) continue;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      await db.insert(schema[key] as any).values(chunk as any);
    }
  }
  return counts;
}
