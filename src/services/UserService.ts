import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { isRole } from "@/config/permissions";
import { isUniqueViolation } from "@/lib/db-errors";
import { HttpError } from "@/lib/errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/password";
import type { ProfileInput } from "@/lib/validation/user";
import * as AuditService from "@/services/AuditService";
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
      themePreference: schema.users.themePreference,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!row) return null;
  const theme = row.themePreference;
  return { ...toSessionUser(row), themePreference: theme === "light" || theme === "dark" ? theme : "system" };
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

export interface UserOption {
  id: string;
  name: string;
}

/** Everyone who can appear as a cashier, for filter dropdowns. */
export async function listUserOptions(): Promise<UserOption[]> {
  return db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .orderBy(sql`lower(${schema.users.name})`)
    .limit(500);
}

// ---------------------------------------------------------------------------
// Own profile
// ---------------------------------------------------------------------------

/** Name, email and theme. SSO accounts get name and email from the identity provider, so those stay read-only. */
export async function updateOwnProfile(userId: string, patch: ProfileInput): Promise<void> {
  const [row] = await db.select({ password: schema.users.password }).from(schema.users).where(eq(schema.users.id, userId));
  if (!row) throw HttpError.notFound("User not found.");
  if (row.password === null && (patch.name !== undefined || patch.email !== undefined)) {
    throw HttpError.badRequest("Your name and email come from single sign-on and can't be changed here.");
  }
  const values: Partial<typeof schema.users.$inferInsert> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.email !== undefined) values.email = patch.email;
  if (patch.themePreference !== undefined) values.themePreference = patch.themePreference;
  if (Object.keys(values).length === 0) return;
  try {
    await db.update(schema.users).set(values).where(eq(schema.users.id, userId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "Another user already has this email.", { email: ["This email is already in use."] });
    }
    throw error;
  }
  await AuditService.log({ userId, action: "profile.update", entity: "user", entityId: userId, metadata: { fields: Object.keys(values) } });
}

export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const [row] = await db.select({ password: schema.users.password }).from(schema.users).where(eq(schema.users.id, userId));
  if (!row) throw HttpError.notFound("User not found.");
  if (row.password === null) throw HttpError.badRequest("Your account uses single sign-on and has no password.");
  if (!(await verifyPassword(currentPassword, row.password))) {
    throw new HttpError(400, "Your current password is not correct.", { currentPassword: ["That isn't your current password."] });
  }
  await db.update(schema.users).set({ password: await hashPassword(newPassword) }).where(eq(schema.users.id, userId));
  await AuditService.log({ userId, action: "profile.password_change", entity: "user", entityId: userId });
}
