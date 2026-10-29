/**
 * Applies the SQL files in ./drizzle to the database in DATABASE_URL.
 * Usage: npm run db:migrate
 */
import { config } from "dotenv";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  // Imported after dotenv so the prefix env var is already loaded.
  const { prefixed } = await import("../src/db/prefix");

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log("Applying migrations...");
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    migrationsTable: prefixed("migrations"),
    migrationsSchema: "public",
  });
  console.log("Migrations are up to date.");

  await pool.end();
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
