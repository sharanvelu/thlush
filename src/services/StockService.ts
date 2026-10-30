import { and, asc, desc, eq, gte, ilike, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { zonedDayRange } from "@/lib/dates";
import { HttpError } from "@/lib/errors";
import { stockStatus, stockValue, type StockStatus } from "@/lib/inventory";
import { D } from "@/lib/money";
import type { MovementQuery, StockAdjustInput, StockListQuery } from "@/lib/validation/inventory";
import * as AuditService from "@/services/AuditService";
import { likePattern } from "@/services/CategoryService";
import type { SessionUser } from "@/types/user";

const { menuItems, categories, stockMovements, users, bills } = schema;

export interface StockRow {
  id: number;
  name: string;
  sku: string | null;
  categoryId: number;
  categoryName: string;
  unit: string;
  stock: string;
  reorderLevel: string;
  costPrice: string;
  value: string;
  status: StockStatus;
}

export interface StockSummary {
  tracked: number;
  /** Stock on hand at cost. */
  value: string;
  low: number;
  out: number;
}

/** Tracked, live items: the only ones whose stock is counted. */
const tracked = and(eq(menuItems.trackStock, true), isNull(menuItems.deletedAt));

const ORDER = {
  name_asc: [asc(sql`lower(${menuItems.name})`)],
  stock_asc: [asc(menuItems.stockQty), asc(sql`lower(${menuItems.name})`)],
  stock_desc: [desc(menuItems.stockQty), asc(sql`lower(${menuItems.name})`)],
  value_desc: [desc(sql`greatest(${menuItems.stockQty}, 0) * ${menuItems.costPrice}`), asc(sql`lower(${menuItems.name})`)],
  category_asc: [asc(sql`lower(${categories.name})`), asc(sql`lower(${menuItems.name})`)],
} as const;

function statusCondition(status: StockQuery["status"]): SQL | undefined {
  if (status === "out") return lte(menuItems.stockQty, "0");
  if (status === "low") return and(sql`${menuItems.stockQty} > 0`, sql`${menuItems.stockQty} <= ${menuItems.reorderLevel}`);
  if (status === "in") return sql`${menuItems.stockQty} > 0 and ${menuItems.stockQty} > ${menuItems.reorderLevel}`;
  return undefined;
}
type StockQuery = Pick<StockListQuery, "status">;

export async function listStock(query: StockListQuery): Promise<{ rows: StockRow[]; total: number; summary: StockSummary }> {
  const pattern = query.q ? likePattern(query.q) : null;
  const where = and(
    tracked,
    pattern ? or(ilike(menuItems.name, pattern), ilike(menuItems.sku, pattern)) : undefined,
    query.category ? eq(menuItems.categoryId, query.category) : undefined,
    statusCondition(query.status),
  );

  const [rows, totals, summary] = await Promise.all([
    db
      .select({
        id: menuItems.id, name: menuItems.name, sku: menuItems.sku, categoryId: menuItems.categoryId, categoryName: categories.name,
        unit: menuItems.unit, stock: menuItems.stockQty, reorderLevel: menuItems.reorderLevel, costPrice: menuItems.costPrice,
      })
      .from(menuItems)
      .innerJoin(categories, eq(categories.id, menuItems.categoryId))
      .where(where)
      .orderBy(...ORDER[query.sort], asc(menuItems.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(menuItems).where(where),
    // The summary describes all tracked stock, not just what the filters show.
    db
      .select({
        n: sql<number>`count(*)`.mapWith(Number),
        value: sql<string>`coalesce(sum(greatest(${menuItems.stockQty}, 0) * ${menuItems.costPrice}), 0)`,
        out: sql<number>`count(*) filter (where ${menuItems.stockQty} <= 0)`.mapWith(Number),
        low: sql<number>`count(*) filter (where ${menuItems.stockQty} > 0 and ${menuItems.stockQty} <= ${menuItems.reorderLevel})`.mapWith(Number),
      })
      .from(menuItems)
      .where(tracked),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      stock: new D(r.stock).toString(),
      reorderLevel: new D(r.reorderLevel).toString(),
      value: stockValue(r.stock, r.costPrice),
      status: stockStatus(r.stock, r.reorderLevel),
    })),
    total: totals[0]?.n ?? 0,
    summary: {
      tracked: summary[0]?.n ?? 0,
      value: new D(summary[0]?.value ?? 0).toFixed(2),
      low: summary[0]?.low ?? 0,
      out: summary[0]?.out ?? 0,
    },
  };
}

export interface TrackedOption {
  id: number;
  name: string;
  unit: string;
  stock: string;
  costPrice: string;
}

/** Tracked items for pickers (adjustments, purchases). */
export async function listTrackedOptions(): Promise<TrackedOption[]> {
  const rows = await db
    .select({ id: menuItems.id, name: menuItems.name, unit: menuItems.unit, stock: menuItems.stockQty, costPrice: menuItems.costPrice })
    .from(menuItems)
    .where(tracked)
    .orderBy(asc(sql`lower(${menuItems.name})`))
    .limit(2000);
  return rows.map((r) => ({ ...r, stock: new D(r.stock).toString() }));
}

/**
 * Adds or removes stock and records why, in one transaction. The ledger row is never edited or deleted;
 * a mistake is fixed with another adjustment. Removing more than is on hand is refused.
 */
export async function adjustStock(input: StockAdjustInput, user: SessionUser): Promise<{ stock: string; delta: string }> {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(menuItems).where(and(eq(menuItems.id, input.menuItemId), isNull(menuItems.deletedAt))).for("update");
    if (!item) throw HttpError.notFound("Item not found.");
    if (!item.trackStock) throw HttpError.badRequest(`"${item.name}" doesn't track stock. Turn on stock tracking for it in the menu first.`);

    const quantity = new D(input.quantity);
    const delta = input.direction === "add" ? quantity : quantity.negated();
    const next = new D(item.stockQty).plus(delta);
    if (next.isNegative()) {
      throw HttpError.conflict(`Only ${new D(item.stockQty).toString()} ${item.unit} of "${item.name}" in stock, so ${quantity.toString()} can't be removed.`);
    }

    await tx.update(menuItems).set({ stockQty: next.toFixed(3) }).where(eq(menuItems.id, item.id));
    await tx.insert(stockMovements).values({
      menuItemId: item.id,
      delta: delta.toFixed(3),
      reason: input.reason,
      userId: user.id,
      note: input.note,
      balanceAfter: next.toFixed(3),
    });
    await AuditService.record(
      { userId: user.id, action: "stock.adjust", entity: "menu_item", entityId: item.id, metadata: { name: item.name, reason: input.reason, delta: delta.toFixed(3), balance: next.toFixed(3) } },
      tx,
    );
    return { stock: next.toString(), delta: delta.toString() };
  });
}

export interface MovementRow {
  id: number;
  createdAt: string;
  menuItemId: number;
  itemName: string;
  unit: string;
  delta: string;
  balanceAfter: string | null;
  reason: string;
  note: string | null;
  billId: number | null;
  billNo: string | null;
  userName: string | null;
}

/** The stock ledger, newest first. */
export async function listMovements(query: MovementQuery, timeZone: string): Promise<{ rows: MovementRow[]; total: number }> {
  const { start, end } = zonedDayRange(query.from, query.to, timeZone);
  const where = and(
    query.item ? eq(stockMovements.menuItemId, query.item) : undefined,
    query.reason ? eq(stockMovements.reason, query.reason) : undefined,
    start ? gte(stockMovements.createdAt, start) : undefined,
    end ? lt(stockMovements.createdAt, end) : undefined,
  );
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: stockMovements.id, createdAt: stockMovements.createdAt, menuItemId: stockMovements.menuItemId, itemName: menuItems.name,
        unit: menuItems.unit, delta: stockMovements.delta, balanceAfter: stockMovements.balanceAfter, reason: stockMovements.reason,
        note: stockMovements.note, billId: stockMovements.billId, billNo: bills.billNo, userName: users.name,
      })
      .from(stockMovements)
      .innerJoin(menuItems, eq(menuItems.id, stockMovements.menuItemId))
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .leftJoin(bills, eq(bills.id, stockMovements.billId))
      .where(where)
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(stockMovements).where(where),
  ]);
  return {
    rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), delta: new D(r.delta).toString(), balanceAfter: r.balanceAfter === null ? null : new D(r.balanceAfter).toString() })),
    total: totals[0]?.n ?? 0,
  };
}

/** Tracked items at or under their reorder level, emptiest first. Used by the bell and the dashboard. */
export async function lowStock(limit = 8) {
  const low = and(tracked, lte(menuItems.stockQty, menuItems.reorderLevel));
  const [rows, [count]] = await Promise.all([
    db
      .select({ id: menuItems.id, name: menuItems.name, stock: menuItems.stockQty, reorderLevel: menuItems.reorderLevel, unit: menuItems.unit })
      .from(menuItems)
      .where(low)
      .orderBy(sql`${menuItems.stockQty} - ${menuItems.reorderLevel}`, menuItems.name)
      .limit(limit),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(menuItems).where(low),
  ]);
  return {
    total: count?.n ?? 0,
    items: rows.map((r) => ({ ...r, stock: new D(r.stock).toString(), reorderLevel: new D(r.reorderLevel).toString() })),
  };
}
export type LowStockAlerts = Awaited<ReturnType<typeof lowStock>>;
