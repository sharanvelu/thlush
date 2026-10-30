import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, ne, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { hasPermission } from "@/config/permissions";
import { zonedDayRange } from "@/lib/dates";
import { HttpError } from "@/lib/errors";
import type { ExportBill } from "@/lib/bill-export";
import type { BillFilters, BillReverseInput, BillSort } from "@/lib/validation/bill-history";
import * as AuditService from "@/services/AuditService";
import * as BillingService from "@/services/BillingService";
import { likePattern } from "@/services/CategoryService";
import { D } from "@/lib/money";
import type { BillDetail, BillStatus, PaymentMethod } from "@/types/bill";
import type { SessionUser } from "@/types/user";

const { bills, billItems, payments, customers, users, stockMovements, menuItems } = schema;

export interface BillListRow {
  id: number;
  billNo: string;
  createdAt: string;
  customerName: string | null;
  itemCount: number;
  methods: PaymentMethod[];
  total: string;
  currency: string;
  status: BillStatus;
  cashierName: string | null;
}

export interface BillListResult {
  rows: BillListRow[];
  total: number;
  /** Sum of completed bills matching the filters (void, refunded and held are not revenue). */
  revenue: string;
}

const ORDER: Record<BillSort, (tie: SQL) => SQL[]> = {
  date_desc: () => [desc(bills.createdAt), desc(bills.id)],
  date_asc: () => [asc(bills.createdAt), asc(bills.id)],
  total_desc: () => [desc(bills.totalAmount), desc(bills.createdAt)],
  total_asc: () => [asc(bills.totalAmount), desc(bills.createdAt)],
  customer_asc: () => [sql`lower(${customers.name}) asc nulls last`, desc(bills.createdAt)],
  customer_desc: () => [sql`lower(${customers.name}) desc nulls last`, desc(bills.createdAt)],
};

/** A cashier can only ever see their own bills, whatever filters were asked for. */
function scope<F extends BillFilters>(filters: F, user: SessionUser): F {
  return hasPermission(user.role, "bills.view_all") ? filters : { ...filters, cashier: user.id };
}

/** Filters from the URL, plus ones only the server may set. */
export type ScopedBillFilters = BillFilters & { customerId?: number };

function conditions(filters: ScopedBillFilters, timeZone: string): SQL[] {
  const out: SQL[] = [];
  const { start, end } = zonedDayRange(filters.from, filters.to, timeZone);
  if (start) out.push(gte(bills.createdAt, start));
  if (end) out.push(lt(bills.createdAt, end));
  if (filters.customer) out.push(ilike(customers.name, likePattern(filters.customer)));
  if (filters.item) {
    out.push(
      sql`exists (select 1 from ${billItems} where ${billItems.billId} = ${bills.id} and ${billItems.name} ilike ${likePattern(filters.item)})`,
    );
  }
  if (filters.min !== undefined) out.push(gte(bills.totalAmount, filters.min));
  if (filters.max !== undefined) out.push(lte(bills.totalAmount, filters.max));
  if (filters.method) {
    out.push(sql`exists (select 1 from ${payments} where ${payments.billId} = ${bills.id} and ${payments.method} = ${filters.method})`);
  }
  // Held bills are unfinished drafts, so they only show when asked for.
  out.push(filters.status ? eq(bills.status, filters.status) : ne(bills.status, "held"));
  if (filters.cashier) out.push(eq(bills.createdUserId, filters.cashier));
  if (filters.customerId !== undefined) out.push(eq(bills.customerId, filters.customerId));
  return out;
}

export async function listBills(
  filters: ScopedBillFilters,
  paging: { page: number; pageSize: number },
  user: SessionUser,
  timeZone: string,
): Promise<BillListResult> {
  const where = and(...conditions(scope(filters, user), timeZone));
  const base = () =>
    db
      .select({
        id: bills.id,
        billNo: bills.billNo,
        createdAt: bills.createdAt,
        currency: bills.currency,
        status: bills.status,
        total: bills.totalAmount,
        customerName: customers.name,
        cashierName: users.name,
        itemCount: sql<number>`(select count(*) from ${billItems} where ${billItems.billId} = ${bills.id})`.mapWith(Number),
        methods: sql<string | null>`(select string_agg(distinct ${payments.method}::text, ',') from ${payments} where ${payments.billId} = ${bills.id})`,
      })
      .from(bills)
      .leftJoin(customers, eq(customers.id, bills.customerId))
      .leftJoin(users, eq(users.id, bills.createdUserId));

  const [rows, totals] = await Promise.all([
    base()
      .where(where)
      .orderBy(...ORDER[filters.sort](sql``))
      .limit(paging.pageSize)
      .offset((paging.page - 1) * paging.pageSize),
    db
      .select({
        n: sql<number>`count(*)`.mapWith(Number),
        revenue: sql<string>`coalesce(sum(case when ${bills.status} = 'completed' then ${bills.totalAmount} else 0 end), 0)`,
      })
      .from(bills)
      .leftJoin(customers, eq(customers.id, bills.customerId))
      .where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      billNo: r.billNo,
      createdAt: r.createdAt.toISOString(),
      customerName: r.customerName,
      itemCount: r.itemCount,
      methods: (r.methods ? r.methods.split(",") : []) as PaymentMethod[],
      total: r.total,
      currency: r.currency,
      status: r.status,
      cashierName: r.cashierName,
    })),
    total: totals[0]?.n ?? 0,
    revenue: new D(totals[0]?.revenue ?? 0).toFixed(2),
  };
}

export const EXPORT_BILL_LIMIT = 10_000;

/** Bills (with their lines) matching the filters, for CSV and XLSX export. */
export async function listBillsForExport(
  filters: BillFilters,
  user: SessionUser,
  timeZone: string,
): Promise<{ bills: ExportBill[]; truncated: boolean }> {
  const where = and(...conditions(scope(filters, user), timeZone));
  const rows = await db
    .select({
      id: bills.id,
      billNo: bills.billNo,
      createdAt: bills.createdAt,
      currency: bills.currency,
      status: bills.status,
      totalTax: bills.totalTax,
      customerName: customers.name,
    })
    .from(bills)
    .leftJoin(customers, eq(customers.id, bills.customerId))
    .where(where)
    .orderBy(...ORDER[filters.sort](sql``))
    .limit(EXPORT_BILL_LIMIT + 1);

  const truncated = rows.length > EXPORT_BILL_LIMIT;
  const page = truncated ? rows.slice(0, EXPORT_BILL_LIMIT) : rows;
  if (page.length === 0) return { bills: [], truncated: false };

  const items = await db
    .select()
    .from(billItems)
    .where(inArray(billItems.billId, page.map((b) => b.id)))
    .orderBy(asc(billItems.billId), asc(billItems.id));
  const byBill = new Map<number, typeof items>();
  for (const item of items) byBill.set(item.billId, [...(byBill.get(item.billId) ?? []), item]);

  return {
    truncated,
    bills: page.map((b) => ({
      billNo: b.billNo,
      createdAt: b.createdAt,
      currency: b.currency,
      status: b.status,
      customerName: b.customerName,
      totalTax: b.totalTax,
      items: (byBill.get(b.id) ?? []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        discount: i.discount,
        sgst: i.sgst,
        cgst: i.cgst,
        total: i.total,
      })),
    })),
  };
}

/**
 * Voids or refunds a completed bill and puts its stock back, in one transaction.
 * Stock returns exactly what this bill's sale took out (read from the stock ledger),
 * so items that were not tracked at the time are not credited.
 */
export async function reverseBill(id: number, input: BillReverseInput, user: SessionUser): Promise<BillDetail> {
  if (!hasPermission(user.role, "bills.void")) throw HttpError.forbidden();

  await db.transaction(async (tx) => {
    const [bill] = await tx.select().from(bills).where(eq(bills.id, id)).for("update");
    if (!bill) throw HttpError.notFound("Bill not found.");
    if (bill.status !== "completed") {
      throw HttpError.conflict(
        bill.status === "held" ? "A held bill can't be voided. Discard it instead." : `This bill is already ${bill.status}.`,
      );
    }

    const sales = await tx
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.billId, id), eq(stockMovements.reason, "sale")))
      .orderBy(asc(stockMovements.menuItemId));

    const now = new Date();
    for (const sale of sales) {
      const restore = new D(sale.delta).negated();
      const [updated] = await tx
        .update(menuItems)
        .set({ stockQty: sql`${menuItems.stockQty} + ${restore.toFixed(3)}::numeric` })
        .where(eq(menuItems.id, sale.menuItemId))
        .returning({ stockQty: menuItems.stockQty });
      if (!updated) continue;
      await tx.insert(stockMovements).values({
        menuItemId: sale.menuItemId,
        delta: restore.toFixed(3),
        reason: input.type,
        billId: id,
        userId: user.id,
        note: input.reason,
        balanceAfter: updated.stockQty,
        createdAt: now,
      });
    }

    await tx
      .update(bills)
      .set({
        status: input.type === "void" ? "void" : "refunded",
        voidedAt: now,
        voidReason: input.reason,
        voidedBy: user.id,
      })
      .where(eq(bills.id, id));

    await AuditService.record(
      {
        userId: user.id,
        action: input.type === "void" ? "bill.void" : "bill.refund",
        entity: "bill",
        entityId: id,
        metadata: { billNo: bill.billNo, total: bill.totalAmount, reason: input.reason, restocked: sales.length },
      },
      tx,
    );
  });

  return BillingService.getBill(id, user);
}
