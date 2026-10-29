import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

/**
 * Neon serverless client over WebSockets. The HTTP driver cannot run
 * interactive transactions, and saving a bill needs one transaction.
 */
neonConfig.webSocketConstructor = ws;

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  return drizzle(new Pool({ connectionString }), { schema });
}

export type Database = ReturnType<typeof createDatabase>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the root client or a transaction, for service helpers used in both. */
export type DbExecutor = Database | Transaction;

// Reused across hot reloads in development so we do not leak connections.
const globalForDb = globalThis as unknown as { __appDb?: Database };

function getDatabase(): Database {
  if (!globalForDb.__appDb) globalForDb.__appDb = createDatabase();
  return globalForDb.__appDb;
}

/**
 * The shared Drizzle client. It connects on first use rather than on import, so
 * building the app or importing a module never requires a database.
 */
export const db: Database = new Proxy({} as Database, {
  get: (_target, property) => Reflect.get(getDatabase(), property),
});

export { schema };
