import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Shared Drizzle client over the Neon serverless HTTP driver.
 *
 * The HTTP driver is stateless and connection-pool friendly, which suits
 * Next.js Server Components and Route Handlers running on Vercel's serverless
 * runtime. A single instance is memoised per module.
 *
 * The client is created **lazily** on first use (not at import) so that a
 * deployment missing `DATABASE_URL` does not hard-crash every route at module
 * initialisation — the error surfaces only when a query runs, where it is
 * handled by the route error boundary and the /api/health endpoint.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env (local) or set it as a Vercel environment variable.",
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as { relayDb?: Db };

function getDb(): Db {
  if (!globalForDb.relayDb) {
    globalForDb.relayDb = drizzle(neon(getConnectionString()), { schema });
  }
  return globalForDb.relayDb;
}

/** Lazily-initialised Drizzle client. Accessing a property constructs it once. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
}) as Db;

export { schema };
