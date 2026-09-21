import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Shared Drizzle client over the Neon serverless HTTP driver.
 *
 * The HTTP driver is stateless and connection-pool friendly, which suits
 * Next.js Server Components and Route Handlers running on Vercel's serverless
 * runtime. A single instance is memoised per module to avoid re-creating the
 * SQL executor on every request in development.
 */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and provide a Neon connection string.",
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  relayDb?: ReturnType<typeof drizzle<typeof schema>>;
};

export const db =
  globalForDb.relayDb ??
  drizzle(neon(getConnectionString()), { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.relayDb = db;
}

export { schema };
