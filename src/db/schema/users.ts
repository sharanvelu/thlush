import { sql } from "drizzle-orm";
import { jsonb, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, ix, table, updatedAt, userRole } from "./_shared";

export const users = table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** bcrypt hash. Null for SSO-only users, who cannot sign in with a password. */
    password: text("password"),
    role: userRole("role").notNull().default("billing"),
    themePreference: text("theme_preference").notNull().default("system"),
    /** Raw OIDC profile, kept for users provisioned through SSO. */
    oidcData: jsonb("oidc_data").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex(ix("users_email_key")).on(sql`lower(${t.email})`)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
