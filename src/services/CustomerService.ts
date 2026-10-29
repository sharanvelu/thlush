import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema, type DbExecutor } from "@/db";
import { likePattern } from "@/services/CategoryService";

const { customers } = schema;

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
