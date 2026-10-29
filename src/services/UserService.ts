import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { isRole } from "@/config/permissions";
import { burnPasswordCheck, verifyPassword } from "@/lib/password";
import type { SessionUser, UserProfile } from "@/types/user";
import type { UserRow } from "@/db/schema";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toSessionUser(row: Pick<UserRow, "id" | "name" | "email" | "role">): SessionUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function findByEmail(email: string): Promise<UserRow | undefined> {
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(sql`lower(${schema.users.email})`, normalizeEmail(email)))
    .limit(1);
  return row;
}

/** Fresh user data from the database. Used to authorise every request. */
export async function findSessionUser(id: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return row ? toSessionUser(row) : null;
}

export async function getProfile(id: string): Promise<UserProfile | null> {
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!row) return null;
  const theme = row.themePreference;
  return {
    ...toSessionUser(row),
    themePreference: theme === "light" || theme === "dark" ? theme : "system",
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
    hasPassword: row.password !== null,
  };
}

export async function touchLastLogin(id: string): Promise<void> {
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, id));
}

/**
 * Checks an email and password. Returns the user on success and null on any
 * failure, without revealing which part was wrong. SSO-only users (no password)
 * can never sign in this way.
 */
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const user = await findByEmail(email);
  if (!user || !user.password) {
    await burnPasswordCheck(password);
    return null;
  }
  const ok = await verifyPassword(password, user.password);
  if (!ok) return null;
  await touchLastLogin(user.id);
  return toSessionUser(user);
}

export interface OidcIdentity {
  email: string;
  name: string;
  /** The full claims object returned by the identity provider. */
  profile: Record<string, unknown>;
}

/**
 * Just-in-time provisioning for SSO sign-ins. Existing users (matched by email)
 * keep their role. New users get the least-privileged role.
 */
export async function upsertFromOidc(identity: OidcIdentity): Promise<SessionUser> {
  const email = normalizeEmail(identity.email);
  const name = identity.name.trim() || email;
  const existing = await findByEmail(email);

  if (existing) {
    const [updated] = await db
      .update(schema.users)
      .set({ name, oidcData: identity.profile, lastLoginAt: new Date() })
      .where(eq(schema.users.id, existing.id))
      .returning();
    return toSessionUser(updated ?? existing);
  }

  const [created] = await db
    .insert(schema.users)
    .values({
      name,
      email,
      password: null,
      role: "billing",
      oidcData: identity.profile,
      lastLoginAt: new Date(),
    })
    .returning();
  if (!created) throw new Error("Failed to create SSO user.");
  return toSessionUser(created);
}

export function parseRole(value: unknown) {
  return isRole(value) ? value : null;
}
