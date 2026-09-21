/**
 * Emits the deterministic seed as plain SQL files.
 *
 * Used to apply the seed in environments where the Neon serverless driver
 * cannot reach the database directly (e.g. restricted egress) — the SQL is
 * applied through the Neon management tooling instead. Column names and types
 * are read straight from the Drizzle schema, so this stays in sync with it.
 *
 * Usage: `RELAY_SQL_DIR=./_seedsql tsx src/db/seed-emit.ts`
 */
import "dotenv/config";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { getTableColumns } from "drizzle-orm";
import * as schema from "./schema";
import { generateSeed, SEED_TABLE_ORDER, type SeedResult } from "./seed-data";

const TABLE_NAMES: Record<keyof SeedResult, string> = {
  services: "services",
  serviceDependencies: "service_dependencies",
  integrations: "integrations",
  runbooks: "runbooks",
  runbookSteps: "runbook_steps",
  incidents: "incidents",
  events: "events",
  incidentEvents: "incident_events",
  triageDecisions: "triage_decisions",
  automationExecutions: "automation_executions",
  approvals: "approvals",
  auditEvents: "audit_events",
  serviceMetrics: "service_metrics",
  capacityForecasts: "capacity_forecasts",
  resourceScenarios: "resource_scenarios",
  notifications: "notifications",
};

function serialiseValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === "object") {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function main() {
  const dir = process.env.RELAY_SQL_DIR ?? "./_seedsql";
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const data = generateSeed();
  let fileIndex = 0;
  const files: string[] = [];

  // Truncate everything first.
  const truncate =
    "TRUNCATE TABLE notifications, resource_scenarios, capacity_forecasts, service_metrics, " +
    "audit_events, approvals, automation_executions, runbook_steps, runbooks, triage_decisions, " +
    "incident_events, events, incidents, integrations, service_dependencies, services RESTART IDENTITY CASCADE;\n";
  writeFile(dir, files, ++fileIndex, truncate);

  const ROWS_PER_STATEMENT = 2000;
  const MAX_FILE_BYTES = 10_000_000;

  for (const { key } of SEED_TABLE_ORDER) {
    const table = schema[key];
    const cols = getTableColumns(table) as Record<string, { name: string }>;
    const jsKeys = Object.keys(cols);
    const dbCols = jsKeys.map((k) => `"${cols[k].name}"`).join(", ");
    const rows = data[key] as Record<string, unknown>[];
    if (rows.length === 0) continue;

    const tableName = TABLE_NAMES[key];
    let buffer = "";
    for (let i = 0; i < rows.length; i += ROWS_PER_STATEMENT) {
      const slice = rows.slice(i, i + ROWS_PER_STATEMENT);
      const valuesSql = slice
        .map((row) => "(" + jsKeys.map((k) => serialiseValue(row[k])).join(", ") + ")")
        .join(",\n  ");
      buffer += `INSERT INTO ${tableName} (${dbCols}) VALUES\n  ${valuesSql};\n`;
      if (buffer.length >= MAX_FILE_BYTES) {
        writeFile(dir, files, ++fileIndex, buffer);
        buffer = "";
      }
    }
    if (buffer.length > 0) {
      writeFile(dir, files, ++fileIndex, buffer);
    }
  }

  writeFileSync(`${dir}/manifest.json`, JSON.stringify({ files }, null, 2));
  console.log(`✓ Emitted ${files.length} SQL files to ${dir}`);
  files.forEach((f) => console.log(`  - ${f}`));
}

function writeFile(dir: string, files: string[], index: number, contents: string) {
  const name = `${String(index).padStart(3, "0")}.sql`;
  writeFileSync(`${dir}/${name}`, contents);
  files.push(name);
}

main();
