import { jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { table } from "./_shared";
import { users } from "./users";

/** One row per top-level settings group (see `AppSettings`). */
export const settings = table("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export type SettingRow = typeof settings.$inferSelect;
