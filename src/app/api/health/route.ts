import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getEnv } from "@/env";
import { fail, ok } from "@/lib/api";

/** Public liveness check: validates configuration and pings the database. */
export async function GET() {
  try {
    getEnv();
  } catch {
    return fail("Server configuration is invalid.", 503);
  }

  try {
    await db.execute(sql`select 1`);
  } catch {
    return fail("Database is unreachable.", 503);
  }

  return ok({ status: "ok" });
}
