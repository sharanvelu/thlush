import { and, desc, eq, gte, isNull, lt, lte, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { hasPermission } from "@/config/permissions";
import { zonedStartOfDay, nextDay } from "@/lib/dates";
import { fillSeries, foldSlices, listDays, percentChange, type ResolvedRange, type SeriesPoint } from "@/lib/dashboard";
import { D } from "@/lib/money";
import * as BillHistoryService from "@/services/BillHistoryService";
import type { PaymentMethod } from "@/types/bill";
import type { SessionUser } from "@/types/user";

const { bills, billItems, payments, menuItems, categories, customers } = schema;

export interface Kpi {
  current: string;
  previous: string;
  /** Percent change against the previous period, or null when there is nothing to compare. */
  change: number | null;
}

export interface DashboardData {
  range: ResolvedRange;
  /** True when the figures cover only the viewer's own bills. */
  ownOnly: boolean;
  kpis: { bills: Kpi; revenue: Kpi; averageOrder: Kpi; itemsSold: Kpi };
  overall: { bills: number; revenue: string; menuItems: number; categories: number; customers: number };
  /** Hourly when the range is one day, otherwise daily. */
  revenueSeries: { granularity: "hour" | "day"; points: SeriesPoint[] };
  billsPerHour: Array<{ hour: number; bills: number }>;
  salesByCategory: Array<{ name: string; value: string; color: string | null }>;
  paymentSplit: Array<{ method: PaymentMethod; amount: string; bills: number }>;
  topItems: Array<{ name: string; quantity: string; revenue: string }>;
  /** Null when the viewer's role cannot see inventory. */
  lowStock: { total: number; items: Array<{ id: number; name: string; stock: string; reorderLevel: string; unit: string }> } | null;
  recentBills: BillHistoryService.BillListRow[];
}

const num = (v: unknown) => new D((v as string | number | null) ?? 0);

export async function getDashboard(range: ResolvedRange, user: SessionUser, timeZone: string): Promise<DashboardData> {
  const ownOnly = !hasPermission(user.role, "bills.view_all");
  const start = zonedStartOfDay(range.from, timeZone);
  const end = zonedStartOfDay(nextDay(range.to), timeZone);
  const prevStart = zonedStartOfDay(range.prevFrom, timeZone);
  const prevEnd = zonedStartOfDay(nextDay(range.prevTo), timeZone);

  /** Completed bills only: void, refunded and held bills are not sales. */
  const inPeriod = (from: Date, to: Date): SQL[] => [
    eq(bills.status, "completed"),
    gte(bills.createdAt, from),
    lt(bills.createdAt, to),
    ...(ownOnly ? [eq(bills.createdUserId, user.id)] : []),
  ];
  const local = sql`(${bills.createdAt} at time zone ${timeZone}::text)`;

  const period = async (from: Date, to: Date) => {
    const where = and(...inPeriod(from, to));
    const [[totals], [items]] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number), revenue: sql<string>`coalesce(sum(${bills.totalAmount}), 0)` })
        .from(bills)
        .where(where),
      db
        .select({ qty: sql<string>`coalesce(sum(${billItems.quantity}), 0)` })
        .from(billItems)
        .innerJoin(bills, eq(bills.id, billItems.billId))
        .where(where),
    ]);
    const count = totals?.n ?? 0;
    const revenue = num(totals?.revenue);
    return { bills: count, revenue, itemsSold: num(items?.qty), average: count > 0 ? revenue.div(count) : new D(0) };
  };

  const where = and(...inPeriod(start, end));

  const [cur, prev, byDay, byHour, categoryRows, paymentRows, topRows, overall, lowRows, recent] = await Promise.all([
    period(start, end),
    period(prevStart, prevEnd),
    db
      .select({
        key: sql<string>`to_char(${local}, 'YYYY-MM-DD')`,
        bills: sql<number>`count(*)`.mapWith(Number),
        revenue: sql<string>`coalesce(sum(${bills.totalAmount}), 0)`,
      })
      .from(bills)
      .where(where)
      .groupBy(sql`1`),
    db
      .select({
        hour: sql<number>`extract(hour from ${local})`.mapWith(Number),
        bills: sql<number>`count(*)`.mapWith(Number),
        revenue: sql<string>`coalesce(sum(${bills.totalAmount}), 0)`,
      })
      .from(bills)
      .where(where)
      .groupBy(sql`1`),
    db
      .select({
        name: sql<string>`coalesce(${categories.name}, 'Other')`,
        color: categories.color,
        value: sql<string>`coalesce(sum(${billItems.total}), 0)`,
      })
      .from(billItems)
      .innerJoin(bills, eq(bills.id, billItems.billId))
      .leftJoin(menuItems, eq(menuItems.id, billItems.menuItemId))
      .leftJoin(categories, eq(categories.id, menuItems.categoryId))
      .where(where)
      .groupBy(categories.id, categories.name, categories.color)
      .orderBy(desc(sql`3`)),
    db
      .select({
        method: payments.method,
        amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
        bills: sql<number>`count(distinct ${payments.billId})`.mapWith(Number),
      })
      .from(payments)
      .innerJoin(bills, eq(bills.id, payments.billId))
      .where(where)
      .groupBy(payments.method)
      .orderBy(desc(sql`2`)),
    db
      .select({
        name: sql<string>`max(coalesce(${menuItems.name}, ${billItems.name}))`,
        quantity: sql<string>`sum(${billItems.quantity})`,
        revenue: sql<string>`sum(${billItems.total})`,
      })
      .from(billItems)
      .innerJoin(bills, eq(bills.id, billItems.billId))
      .leftJoin(menuItems, eq(menuItems.id, billItems.menuItemId))
      .where(where)
      // Variants of one menu item count together; deleted items fall back to their saved name.
      .groupBy(sql`coalesce(${billItems.menuItemId}::text, ${billItems.name})`)
      .orderBy(desc(sql`2`), desc(sql`3`))
      .limit(5),
    Promise.all([
      db
        .select({ n: sql<number>`count(*)`.mapWith(Number), revenue: sql<string>`coalesce(sum(${bills.totalAmount}), 0)` })
        .from(bills)
        .where(and(eq(bills.status, "completed"), ...(ownOnly ? [eq(bills.createdUserId, user.id)] : []))),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(menuItems).where(isNull(menuItems.deletedAt)),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(categories),
      db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(customers),
    ]),
    hasPermission(user.role, "inventory.view") ? lowStock() : Promise.resolve(null),
    BillHistoryService.listBills({ sort: "date_desc" }, { page: 1, pageSize: 8 }, user, timeZone),
  ]);

  const hourly = range.days === 1;
  const dayKeys = listDays(range.from, range.to);
  const hourKeys = Array.from({ length: 24 }, (_, h) => String(h));
  const points = hourly
    ? fillSeries(hourKeys, new Map(byHour.map((r) => [String(r.hour), { revenue: num(r.revenue).toFixed(2), bills: r.bills }])))
    : fillSeries(dayKeys, new Map(byDay.map((r) => [r.key, { revenue: num(r.revenue).toFixed(2), bills: r.bills }])));
  const hours = new Map(byHour.map((r) => [r.hour, r.bills]));
  const [[all], [menuCount], [categoryCount], [customerCount]] = overall;

  const kpi = (a: string, b: string): Kpi => ({ current: a, previous: b, change: percentChange(a, b) });
  return {
    range,
    ownOnly,
    kpis: {
      bills: kpi(String(cur.bills), String(prev.bills)),
      revenue: kpi(cur.revenue.toFixed(2), prev.revenue.toFixed(2)),
      averageOrder: kpi(cur.average.toFixed(2), prev.average.toFixed(2)),
      itemsSold: kpi(cur.itemsSold.toString(), prev.itemsSold.toString()),
    },
    overall: {
      bills: all?.n ?? 0,
      revenue: num(all?.revenue).toFixed(2),
      menuItems: menuCount?.n ?? 0,
      categories: categoryCount?.n ?? 0,
      customers: customerCount?.n ?? 0,
    },
    revenueSeries: { granularity: hourly ? "hour" : "day", points },
    billsPerHour: Array.from({ length: 24 }, (_, hour) => ({ hour, bills: hours.get(hour) ?? 0 })),
    salesByCategory: foldSlices(
      categoryRows.filter((r) => num(r.value).greaterThan(0)).map((r) => ({ name: r.name, value: num(r.value).toFixed(2), color: r.color })),
      8,
    ),
    paymentSplit: paymentRows.map((r) => ({ method: r.method, amount: num(r.amount).toFixed(2), bills: r.bills })),
    topItems: topRows.map((r) => ({ name: r.name, quantity: num(r.quantity).toString(), revenue: num(r.revenue).toFixed(2) })),
    lowStock: lowRows,
    recentBills: recent.rows,
  };
}

/** Tracked items at or under their reorder level, emptiest first. Shared with the alerts bell later. */
export async function lowStock(limit = 8) {
  const low = and(eq(menuItems.trackStock, true), isNull(menuItems.deletedAt), lte(menuItems.stockQty, menuItems.reorderLevel));
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
    items: rows.map((r) => ({ ...r, stock: num(r.stock).toString(), reorderLevel: num(r.reorderLevel).toString() })),
  };
}
