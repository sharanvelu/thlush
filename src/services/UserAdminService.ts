import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db, schema, type Transaction } from "@/db";
import type { Role } from "@/config/permissions";
import { isUniqueViolation } from "@/lib/db-errors";
import { HttpError } from "@/lib/errors";
import { D } from "@/lib/money";
import { hashPassword } from "@/lib/password";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "@/lib/validation/user";
import * as AuditService from "@/services/AuditService";
import { likePattern } from "@/services/CategoryService";
import type { SessionUser } from "@/types/user";

const { users, bills } = schema;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
  /** False for SSO-only accounts, which cannot sign in with a password. */
  hasPassword: boolean;
}

const columns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
  hasPassword: sql<boolean>`${users.password} is not null`,
};

function toAdminUser(r: { id: string; name: string; email: string; role: Role; createdAt: Date; lastLoginAt: Date | null; hasPassword: boolean }): AdminUser {
  return { ...r, createdAt: r.createdAt.toISOString(), lastLoginAt: r.lastLoginAt?.toISOString() ?? null };
}

export async function listUsers(query: UserListQuery): Promise<{ rows: AdminUser[]; total: number }> {
  const pattern = query.q ? likePattern(query.q) : null;
  const where = and(
    pattern ? or(ilike(users.name, pattern), ilike(users.email, pattern)) : undefined,
    query.role ? eq(users.role, query.role) : undefined,
  );
  const [rows, totals] = await Promise.all([
    db.select(columns).from(users).where(where).orderBy(sql`lower(${users.name})`, users.id).limit(query.pageSize).offset((query.page - 1) * query.pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(users).where(where),
  ]);
  return { rows: rows.map(toAdminUser), total: totals[0]?.n ?? 0 };
}

export interface UserDetail extends AdminUser {
  /** Completed bills this user has rung up. */
  bills: number;
  revenue: string;
}

export async function getUserDetail(id: string): Promise<UserDetail> {
  const [row] = await db.select(columns).from(users).where(eq(users.id, id));
  if (!row) throw HttpError.notFound("User not found.");
  const [totals] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number), revenue: sql<string>`coalesce(sum(${bills.totalAmount}), 0)` })
    .from(bills)
    .where(and(eq(bills.createdUserId, id), eq(bills.status, "completed")));
  return { ...toAdminUser(row), bills: totals?.n ?? 0, revenue: new D(totals?.revenue ?? 0).toFixed(2) };
}

const emailTaken = () => new HttpError(409, "Another user already has this email.", { email: ["This email is already in use."] });

/** Locks every super admin row so two people can't remove each other at the same moment. */
async function superAdminIds(tx: Transaction): Promise<string[]> {
  const rows = await tx.select({ id: users.id }).from(users).where(eq(users.role, "super_admin")).for("update");
  return rows.map((r) => r.id);
}

export async function createUser(input: CreateUserInput, actor: SessionUser): Promise<AdminUser> {
  const password = await hashPassword(input.password);
  try {
    const id = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({ name: input.name, email: input.email, role: input.role, password }).returning({ id: users.id });
      if (!created) throw new Error("User insert returned no row");
      await AuditService.record({ userId: actor.id, action: "user.create", entity: "user", entityId: created.id, metadata: { email: input.email, role: input.role } }, tx);
      return created.id;
    });
    return toAdminUser((await db.select(columns).from(users).where(eq(users.id, id)))[0]!);
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
}

export async function updateUser(id: string, patch: UpdateUserInput, actor: SessionUser): Promise<AdminUser> {
  const password = patch.password ? await hashPassword(patch.password) : undefined;
  try {
    await db.transaction(async (tx) => {
      const supers = await superAdminIds(tx);
      const [target] = await tx.select().from(users).where(eq(users.id, id)).for("update");
      if (!target) throw HttpError.notFound("User not found.");

      const changesRole = patch.role !== undefined && patch.role !== target.role;
      if (changesRole && id === actor.id) throw HttpError.conflict("You can't change your own role.");
      if (changesRole && target.role === "super_admin" && supers.length <= 1) {
        throw HttpError.conflict("There must always be at least one super admin.");
      }

      const values: Partial<typeof users.$inferInsert> = {};
      if (patch.name !== undefined) values.name = patch.name;
      if (patch.email !== undefined) values.email = patch.email;
      if (patch.role !== undefined) values.role = patch.role;
      if (password) values.password = password;
      if (Object.keys(values).length > 0) await tx.update(users).set(values).where(eq(users.id, id));

      await AuditService.record(
        {
          userId: actor.id,
          action: "user.update",
          entity: "user",
          entityId: id,
          metadata: {
            email: target.email,
            fields: Object.keys(values).filter((k) => k !== "password"),
            ...(changesRole ? { role: { from: target.role, to: patch.role } } : {}),
            ...(password ? { passwordReset: true } : {}),
          },
        },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
  return toAdminUser((await db.select(columns).from(users).where(eq(users.id, id)))[0]!);
}

/** Their bills and audit entries stay; only the link to the account is cleared. */
export async function deleteUser(id: string, actor: SessionUser): Promise<void> {
  if (id === actor.id) throw HttpError.conflict("You can't delete your own account.");
  await db.transaction(async (tx) => {
    const supers = await superAdminIds(tx);
    const [target] = await tx.select().from(users).where(and(eq(users.id, id), ne(users.id, actor.id))).for("update");
    if (!target) throw HttpError.notFound("User not found.");
    if (target.role === "super_admin" && supers.length <= 1) throw HttpError.conflict("There must always be at least one super admin.");
    await tx.delete(users).where(eq(users.id, id));
    await AuditService.record({ userId: actor.id, action: "user.delete", entity: "user", entityId: id, metadata: { name: target.name, email: target.email, role: target.role } }, tx);
  });
}
