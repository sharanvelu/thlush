import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { zonedStartOfDay } from "@/lib/dates";
import { HttpError } from "@/lib/errors";
import { D, parseMoney, parseQuantity, round2 } from "@/lib/money";
import type { PurchaseInput, SupplierData } from "@/lib/validation/inventory";
import * as AuditService from "@/services/AuditService";
import { likePattern } from "@/services/CategoryService";
import type { SessionUser } from "@/types/user";

const { suppliers, purchases, purchaseItems, menuItems, stockMovements } = schema;

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export interface SupplierRecord {
  id: number;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: "active" | "disabled";
  purchases: number;
}

export async function listSuppliers(query: { q?: string; page: number; pageSize: number }): Promise<{ rows: SupplierRecord[]; total: number }> {
  const pattern = query.q ? likePattern(query.q) : null;
  const where = pattern ? or(ilike(suppliers.name, pattern), ilike(suppliers.contactName, pattern), ilike(suppliers.phone, pattern)) : undefined;
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: suppliers.id, name: suppliers.name, contactName: suppliers.contactName, phone: suppliers.phone, email: suppliers.email,
        address: suppliers.address, notes: suppliers.notes, status: suppliers.status,
        // Counted with a join: a subquery on a single-table select loses its table prefix and compares the wrong columns.
        purchases: sql<number>`count(${purchases.id})`.mapWith(Number),
      })
      .from(suppliers)
      .leftJoin(purchases, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .groupBy(suppliers.id)
      .orderBy(asc(sql`lower(${suppliers.name})`), asc(suppliers.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(suppliers).where(where),
  ]);
  return { rows, total: totals[0]?.n ?? 0 };
}

export async function listSupplierOptions(): Promise<Array<{ id: number; name: string; status: "active" | "disabled" }>> {
  return db.select({ id: suppliers.id, name: suppliers.name, status: suppliers.status }).from(suppliers).orderBy(asc(sql`lower(${suppliers.name})`)).limit(500);
}

async function getSupplier(id: number): Promise<SupplierRecord> {
  const { rows } = await listSuppliers({ page: 1, pageSize: 1_000 });
  const found = rows.find((r) => r.id === id);
  if (!found) throw HttpError.notFound("Supplier not found.");
  return found;
}

export async function createSupplier(input: SupplierData, user: SessionUser): Promise<SupplierRecord> {
  const id = await db.transaction(async (tx) => {
    const [created] = await tx.insert(suppliers).values(input).returning({ id: suppliers.id });
    if (!created) throw new Error("Supplier insert returned no row");
    await AuditService.record({ userId: user.id, action: "supplier.create", entity: "supplier", entityId: created.id, metadata: { name: input.name } }, tx);
    return created.id;
  });
  return getSupplier(id);
}

export async function updateSupplier(id: number, patch: Partial<SupplierData>, user: SessionUser): Promise<SupplierRecord> {
  await db.transaction(async (tx) => {
    const [updated] =
      Object.keys(patch).length > 0
        ? await tx.update(suppliers).set(patch).where(eq(suppliers.id, id)).returning({ id: suppliers.id })
        : await tx.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, id));
    if (!updated) throw HttpError.notFound("Supplier not found.");
    await AuditService.record({ userId: user.id, action: "supplier.update", entity: "supplier", entityId: id, metadata: { fields: Object.keys(patch) } }, tx);
  });
  return getSupplier(id);
}

/** Past purchases stay; they simply show no supplier. Disable a supplier instead to keep the link. */
export async function deleteSupplier(id: number, user: SessionUser): Promise<{ purchasesKept: number }> {
  return db.transaction(async (tx) => {
    const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, id)).for("update");
    if (!supplier) throw HttpError.notFound("Supplier not found.");
    const [kept] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(purchases).where(eq(purchases.supplierId, id));
    await tx.delete(suppliers).where(eq(suppliers.id, id));
    await AuditService.record({ userId: user.id, action: "supplier.delete", entity: "supplier", entityId: id, metadata: { name: supplier.name, purchasesKept: kept?.n ?? 0 } }, tx);
    return { purchasesKept: kept?.n ?? 0 };
  });
}

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export interface PurchaseRow {
  id: number;
  invoiceNo: string | null;
  purchasedAt: string;
  supplierId: number | null;
  supplierName: string | null;
  itemCount: number;
  total: string;
  createdBy: string | null;
}

export interface PurchaseDetail extends PurchaseRow {
  notes: string | null;
  items: Array<{ id: number; name: string; quantity: string; costPrice: string; total: string }>;
}

export async function listPurchases(query: { supplier?: number; page: number; pageSize: number }): Promise<{ rows: PurchaseRow[]; total: number }> {
  const where = query.supplier ? eq(purchases.supplierId, query.supplier) : undefined;
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: purchases.id, invoiceNo: purchases.invoiceNo, purchasedAt: purchases.purchasedAt, supplierId: purchases.supplierId,
        supplierName: suppliers.name, total: purchases.totalAmount, createdBy: schema.users.name,
        itemCount: sql<number>`(select count(*) from ${purchaseItems} where ${purchaseItems.purchaseId} = ${purchases.id})`.mapWith(Number),
      })
      .from(purchases)
      .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .leftJoin(schema.users, eq(schema.users.id, purchases.createdUserId))
      .where(where)
      .orderBy(desc(purchases.purchasedAt), desc(purchases.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(purchases).where(where),
  ]);
  return { rows: rows.map((r) => ({ ...r, purchasedAt: r.purchasedAt.toISOString() })), total: totals[0]?.n ?? 0 };
}

export async function getPurchase(id: number): Promise<PurchaseDetail> {
  const rows = await db
    .select({
      id: purchases.id, invoiceNo: purchases.invoiceNo, purchasedAt: purchases.purchasedAt, supplierId: purchases.supplierId,
      supplierName: suppliers.name, total: purchases.totalAmount, notes: purchases.notes, createdBy: schema.users.name,
      itemCount: sql<number>`(select count(*) from ${purchaseItems} where ${purchaseItems.purchaseId} = ${purchases.id})`.mapWith(Number),
    })
    .from(purchases)
    .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
    .leftJoin(schema.users, eq(schema.users.id, purchases.createdUserId))
    .where(eq(purchases.id, id));
  const row = rows[0];
  if (!row) throw HttpError.notFound("Purchase not found.");
  const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).orderBy(asc(purchaseItems.id));
  return {
    ...row,
    purchasedAt: row.purchasedAt.toISOString(),
    items: items.map((i) => ({ id: i.id, name: i.name, quantity: new D(i.quantity).toString(), costPrice: i.costPrice, total: i.total })),
  };
}

/**
 * Receives stock: records the purchase, adds the quantities to stock, writes ledger rows and sets each
 * item's cost price to what was just paid. All of it commits together or not at all.
 */
export async function createPurchase(input: PurchaseInput, user: SessionUser, timeZone: string): Promise<PurchaseDetail> {
  const purchasedAt = input.date ? new Date(zonedStartOfDay(input.date, timeZone).getTime() + 12 * 3_600_000) : new Date();
  if (purchasedAt.getTime() > Date.now() + 60_000) throw HttpError.badRequest("A purchase can't be dated in the future.");

  const id = await db.transaction(async (tx) => {
    if (input.supplierId !== null) {
      const [supplier] = await tx.select({ id: suppliers.id, status: suppliers.status }).from(suppliers).where(eq(suppliers.id, input.supplierId));
      if (!supplier) throw HttpError.badRequest("That supplier no longer exists.");
    }

    const ids = input.items.map((i) => i.menuItemId).sort((a, b) => a - b);
    const found = await tx
      .select()
      .from(menuItems)
      .where(and(inArray(menuItems.id, ids), isNull(menuItems.deletedAt)))
      .orderBy(asc(menuItems.id)) // A fixed lock order keeps two purchases from deadlocking.
      .for("update");
    const byId = new Map(found.map((m) => [m.id, m]));
    for (const line of input.items) {
      const item = byId.get(line.menuItemId);
      if (!item) throw HttpError.badRequest("An item on this purchase no longer exists.");
      if (!item.trackStock) throw HttpError.badRequest(`"${item.name}" doesn't track stock. Turn on stock tracking for it in the menu first.`);
    }

    const lines = input.items.map((line) => {
      const item = byId.get(line.menuItemId)!;
      return { item, quantity: new D(parseQuantity(line.quantity)), cost: parseMoney(line.costPrice), total: round2(new D(line.quantity).times(line.costPrice)) };
    });
    const total = lines.reduce((acc, l) => acc.plus(l.total), new D(0));

    const [purchase] = await tx
      .insert(purchases)
      .values({ supplierId: input.supplierId, invoiceNo: input.invoiceNo, totalAmount: total.toFixed(2), notes: input.notes, purchasedAt, createdUserId: user.id })
      .returning({ id: purchases.id });
    if (!purchase) throw new Error("Purchase insert returned no row");

    await tx.insert(purchaseItems).values(
      lines.map((l) => ({ purchaseId: purchase.id, menuItemId: l.item.id, name: l.item.name, quantity: l.quantity.toFixed(3), costPrice: l.cost, total: l.total.toFixed(2) })),
    );

    const ref = input.invoiceNo ?? `#${purchase.id}`;
    for (const l of lines) {
      const next = new D(l.item.stockQty).plus(l.quantity);
      await tx.update(menuItems).set({ stockQty: next.toFixed(3), costPrice: l.cost }).where(eq(menuItems.id, l.item.id));
      await tx.insert(stockMovements).values({
        menuItemId: l.item.id, delta: l.quantity.toFixed(3), reason: "purchase", userId: user.id, note: `Purchase ${ref}`, balanceAfter: next.toFixed(3), createdAt: purchasedAt,
      });
    }

    await AuditService.record(
      { userId: user.id, action: "purchase.create", entity: "purchase", entityId: purchase.id, metadata: { invoiceNo: input.invoiceNo, supplierId: input.supplierId, items: lines.length, total: total.toFixed(2) } },
      tx,
    );
    return purchase.id;
  });
  return getPurchase(id);
}
