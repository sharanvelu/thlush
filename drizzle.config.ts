import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Only touch objects that belong to this app when diffing against a live database.
  tablesFilter: [`${process.env.DB_TABLE_PREFIX?.trim() || "app_"}*`],
  strict: true,
  verbose: true,
});
