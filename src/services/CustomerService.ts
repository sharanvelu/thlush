import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema, type DbExecutor } from "@/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { HttpError } from "@/lib/errors";
import { D } from "@/lib/money";
import type { CustomerData, CustomerListQuery, CustomerSort } from "@/lib/validation/customer";
import * as AuditService from "@/services/AuditService";
import { likePattern } from "@/services/CategoryService";

const { customers, bills } = schema;

export interface CustomerSummary {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

/** Matches by name or phone, for the billing screen's autocomplete. */
export async function searchCustomers(
  q: string,
  { page = 1, pageSize = 8 }: { page?: number; pageSize?: number } = {},
): Promise<{ rows: CustomerSummary[]; total: number }> {
  const term = q.trim();
  const where = term
    ? or(ilike(customers.name, likePattern(term)), ilike(customers.phone, likePattern(term)))
    : undefined;
  const [rows, totals] = await Promise.all([
    db
      .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
      .from(customers)
      .where(where)
      // Names that start with the term first, then the rest alphabetically.
      .orderBy(
        term ? desc(sql`lower(${customers.name}) like ${`${term.toLowerCase()}%`}`) : asc(customers.id),
        asc(sql`lower(${customers.name})`),
        asc(customers.id),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(customers).where(where),
  ]);
  return { rows, total: totals[0]?.n ?? 0 };
}

export async function findCustomer(id: number, executor: DbExecutor = db): Promise<CustomerSummary | null> {
  const [row] = await executor
    .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
    .from(customers)
    .where(eq(customers.id, id));
  return row ?? null;
}

/**
 * Finds or creates the customer typed on the billing screen. The same name (any
 * case) with the same phone, or with no phone on either side, is the same person,
 * so repeat bills do not create duplicate rows.
 */
export async function resolveNewCustomer(
  input: { name: string; phone: string | null },
  executor: DbExecutor,
): Promise<number> {
  const sameName = eq(sql`lower(${customers.name})`, input.name.toLowerCase());
  const [existing] = await executor
    .select({ id: customers.id })
    .from(customers)
    .where(input.phone ? and(sameName, eq(customers.phone, input.phone)) : and(sameName, sql`${customers.phone} is null`))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await executor
    .insert(customers)
    .values({ name: input.name, phone: input.phone })
    .returning({ id: customers.id });
  if (!created) throw new Error("Customer insert returned no row");
  return created.id;
}

// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------

export interface CustomerRecord extends CustomerSummary {
  notes: string | null;
  tags: string[];
  createdAt: string;
  /** Completed bills only. */
  orders: number;
  spend: string;
  lastVisit: string | null;
}

const stats = {
  orders: sql<number>`count(${bills.id})`.mapWith(Number),
  spend: sql<string>`coalesce(sum(${bills.totalAmount}), 0)`,
  lastVisit: sql<Date | null>`max(${bills.createdAt})`.mapWith((v) => (v ? new Date(v as string) : null)),
};

function toRecord(r: {
  id: number; name: string; phone: string | null; email: string | null; notes: string | null; tags: string[];
  createdAt: Date; orders: number; spend: string; lastVisit: Date | null;
}): CustomerRecord {
  return {
    id: r.id, name: r.name, phone: r.phone, email: r.email, notes: r.notes, tags: r.tags,
    createdAt: r.createdAt.toISOString(), orders: r.orders, spend: new D(r.spend).toFixed(2), lastVisit: r.lastVisit?.toISOString() ?? null,
  };
}

const ORDER: Record<CustomerSort, SQL[]> = {
  name_asc: [asc(sql`lower(${customers.name})`)],
  name_desc: [desc(sql`lower(${customers.name})`)],
  orders_desc: [desc(stats.orders), asc(sql`lower(${customers.name})`)],
  orders_asc: [asc(stats.orders), asc(sql`lower(${customers.name})`)],
  spend_desc: [desc(stats.spend), asc(sql`lower(${customers.name})`)],
  spend_asc: [asc(stats.spend), asc(sql`lower(${customers.name})`)],
  visit_desc: [sql`max(${bills.createdAt}) desc nulls last`, asc(sql`lower(${customers.name})`)],
  visit_asc: [sql`max(${bills.createdAt}) asc nulls last`, asc(sql`lower(${customers.name})`)],
  created_desc: [desc(customers.createdAt)],
};

function baseSelect() {
  return db
    .select({
      id: customers.id, name: customers.name, phone: customers.phone, email: customers.email,
      notes: customers.notes, tags: customers.tags, createdAt: customers.createdAt, ...stats,
    })
    .from(customers)
    .leftJoin(bills, and(eq(bills.customerId, customers.id), eq(bills.status, "completed")))
    .groupBy(customers.id);
}

export async function listCustomerRecords(query: CustomerListQuery): Promise<{ rows: CustomerRecord[]; total: number }> {
  const term = query.q;
  const pattern = term ? likePattern(term) : null;
  const where = pattern
    ? or(ilike(customers.name, pattern), ilike(customers.phone, pattern), ilike(customers.email, pattern), sql`exists (select 1 from unnest(${customers.tags}) t where t ilike ${pattern})`)
    : undefined;
  const [rows, totals] = await Promise.all([
    baseSelect().where(where).orderBy(...ORDER[query.sort], asc(customers.id)).limit(query.pageSize).offset((query.page - 1) * query.pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(customers).where(where),
  ]);
  return { rows: rows.map(toRecord), total: totals[0]?.n ?? 0 };
}

export async function getCustomerRecord(id: number): Promise<CustomerRecord> {
  const [row] = await baseSelect().where(eq(customers.id, id));
  if (!row) throw HttpError.notFound("Customer not found.");
  return toRecord(row);
}

async function assertPhoneFree(phone: string | null, exceptId: number | null) {
  if (!phone) return;
  const [clash] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.phone, phone), exceptId === null ? undefined : ne(customers.id, exceptId)))
    .limit(1);
  if (clash) throw new HttpError(409, "A customer with this phone number already exists.", { phone: ["This phone number is already in use."] });
}

export async function createCustomer(input: CustomerData, userId: string): Promise<CustomerRecord> {
  await assertPhoneFree(input.phone, null);
  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(customers)
      .values({ name: input.name, phone: input.phone, email: input.email, notes: input.notes, tags: input.tags })
      .returning({ id: customers.id });
    if (!created) throw new Error("Customer insert returned no row");
    await AuditService.record({ userId, action: "customer.create", entity: "customer", entityId: created.id, metadata: { name: input.name } }, tx);
    return created.id;
  });
  return getCustomerRecord(id);
}

export async function updateCustomer(id: number, patch: Partial<CustomerData>, userId: string): Promise<CustomerRecord> {
  const values: Partial<typeof customers.$inferInsert> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.phone !== undefined) values.phone = patch.phone;
  if (patch.email !== undefined) values.email = patch.email;
  if (patch.notes !== undefined) values.notes = patch.notes;
  if (patch.tags !== undefined) values.tags = patch.tags;
  if (patch.phone) await assertPhoneFree(patch.phone, id);

  try {
    await db.transaction(async (tx) => {
      const [updated] =
        Object.keys(values).length > 0
          ? await tx.update(customers).set(values).where(eq(customers.id, id)).returning({ id: customers.id })
          : await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, id));
      if (!updated) throw HttpError.notFound("Customer not found.");
      await AuditService.record({ userId, action: "customer.update", entity: "customer", entityId: id, metadata: { fields: Object.keys(values) } }, tx);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw HttpError.conflict("That customer already exists.");
    throw error;
  }
  return getCustomerRecord(id);
}

/** Deletes the customer. Their bills stay: the link is cleared, so they show as walk-in. */
export async function deleteCustomer(id: number, userId: string): Promise<{ billsKept: number }> {
  return db.transaction(async (tx) => {
    const [customer] = await tx.select().from(customers).where(eq(customers.id, id)).for("update");
    if (!customer) throw HttpError.notFound("Customer not found.");
    const [kept] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(bills).where(eq(bills.customerId, id));
    await tx.delete(customers).where(eq(customers.id, id));
    await AuditService.record(
      { userId, action: "customer.delete", entity: "customer", entityId: id, metadata: { name: customer.name, billsKept: kept?.n ?? 0 } },
      tx,
    );
    return { billsKept: kept?.n ?? 0 };
  });
}
