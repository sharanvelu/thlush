/**
 * Report queries. Every report returns the same shape (`ReportData`), so one screen, one CSV writer and
 * one PDF writer serve them all.
 *
 * Sales figures count completed bills only: void, refunded and held bills are not sales. Money is summed
 * in Postgres `numeric`, never as floats.
 */
import { and, asc, desc, eq, gt, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { nextDay, zonedStartOfDay } from "@/lib/dates";
import type { ResolvedRange } from "@/lib/dashboard";
import { D, type Dec } from "@/lib/money";
import { REPORT_META, ROW_LIMIT, share, sumColumn, type Group, type ReportColumn, type ReportData, type ReportKind } from "@/lib/reports";

const { bills, billItems, payments, menuItems, categories, users, stockMovements } = schema;

export interface ReportContext {
  range: ResolvedRange;
  group: Group;
  timeZone: string;
  locale: string;
}

const sumQty = (rows: Array<Record<string, string>>, key: string) => new D(sumColumn(rows, key, 3)).toString();
const money = (v: unknown) => new D((v as string | number | null) ?? 0).toFixed(2);
const qty = (v: unknown) => new D((v as string | number | null) ?? 0).toDecimalPlaces(3).toString();

const label = (iso: string, opts: Intl.DateTimeFormatOptions, locale: string) =>
  new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function periodText(ctx: ReportContext): string {
  const { from, to } = ctx.range;
  const f = (d: string) => label(d, { day: "numeric", month: "short", year: "numeric" }, ctx.locale);
  return from === to ? f(from) : `${f(from)} to ${f(to)}`;
}

function base(kind: ReportKind, ctx: ReportContext | null, partial: Pick<ReportData, "columns" | "rows"> & Partial<ReportData>): ReportData {
  const meta = REPORT_META[kind];
  const limited = partial.rows.length > ROW_LIMIT;
  return {
    kind,
    title: meta.title,
    description: meta.description,
    period: meta.usesRange && ctx ? periodText(ctx) : null,
    totals: null,
    chart: null,
    ...partial,
    rows: limited ? partial.rows.slice(0, ROW_LIMIT) : partial.rows,
    truncated: limited || Boolean(partial.truncated),
  };
}

function window(ctx: ReportContext): SQL[] {
  return [
    eq(bills.status, "completed"),
    gte(bills.createdAt, zonedStartOfDay(ctx.range.from, ctx.timeZone)),
    lt(bills.createdAt, zonedStartOfDay(nextDay(ctx.range.to), ctx.timeZone)),
  ];
}

const localTime = (tz: string) => sql`(${bills.createdAt} at time zone ${tz}::text)`;

// ---- Sales summary ---------------------------------------------------------
async function sales(ctx: ReportContext): Promise<ReportData> {
  const where = and(...window(ctx));
  // `group` is one of three fixed words, so it is safe to inline; as a bind parameter Postgres could not
  // tell the select and group-by expressions apart.
  const bucket = sql`to_char(date_trunc(${sql.raw(`'${ctx.group}'`)}, ${localTime(ctx.timeZone)}), 'YYYY-MM-DD')`;

  const [billRows, itemRows] = await Promise.all([
    db
      .select({
        key: sql<string>`${bucket}`,
        bills: sql<number>`count(*)`.mapWith(Number),
        subtotal: sql<string>`coalesce(sum(${bills.subtotal}), 0)`,
        discount: sql<string>`coalesce(sum(${bills.totalDiscount}), 0)`,
        tax: sql<string>`coalesce(sum(${bills.totalTax}), 0)`,
        total: sql<string>`coalesce(sum(${bills.totalAmount}), 0)`,
      })
      .from(bills)
      .where(where)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({ key: sql<string>`${bucket}`, qty: sql<string>`coalesce(sum(${billItems.quantity}), 0)` })
      .from(billItems)
      .innerJoin(bills, eq(bills.id, billItems.billId))
      .where(where)
      .groupBy(sql`1`),
  ]);
  const items = new Map(itemRows.map((r) => [r.key, r.qty]));

  const fmt = (key: string): string => {
    if (ctx.group === "month") return label(key, { month: "short", year: "numeric" }, ctx.locale);
    const day = label(key, { day: "numeric", month: "short", year: "numeric" }, ctx.locale);
    return ctx.group === "week" ? `Week of ${day}` : day;
  };

  const rows = billRows.map((r) => ({
    period: fmt(r.key),
    bills: String(r.bills),
    items: qty(items.get(r.key)),
    subtotal: money(r.subtotal),
    discount: money(r.discount),
    tax: money(r.tax),
    total: money(r.total),
    average: r.bills > 0 ? new D(r.total).div(r.bills).toFixed(2) : "0.00",
  }));
  const totalBills = rows.reduce((n, r) => n + Number(r.bills), 0);
  const totalAmount = sumColumn(rows, "total");

  return base("sales", ctx, {
    columns: [
      { key: "period", label: ctx.group === "day" ? "Date" : ctx.group === "week" ? "Week" : "Month", format: "text" },
      { key: "bills", label: "Bills", format: "number" },
      { key: "items", label: "Items sold", format: "number" },
      { key: "subtotal", label: "Subtotal", format: "money" },
      { key: "discount", label: "Discount", format: "money" },
      { key: "tax", label: "Tax", format: "money" },
      { key: "total", label: "Total", format: "money" },
      { key: "average", label: "Avg bill", format: "money" },
    ],
    rows,
    totals: {
      bills: String(totalBills),
      items: sumQty(rows, "items"),
      subtotal: sumColumn(rows, "subtotal"),
      discount: sumColumn(rows, "discount"),
      tax: sumColumn(rows, "tax"),
      total: totalAmount,
      average: totalBills > 0 ? new D(totalAmount).div(totalBills).toFixed(2) : "0.00",
    },
    chart: { type: "area", labelKey: "period", valueKey: "total", valueLabel: "Total", format: "money" },
  });
}

// ---- By category -----------------------------------------------------------
async function byCategory(ctx: ReportContext): Promise<ReportData> {
  const data = await db
    .select({
      name: sql<string>`coalesce(${categories.name}, 'Other')`,
      qty: sql<string>`coalesce(sum(${billItems.quantity}), 0)`,
      revenue: sql<string>`coalesce(sum(${billItems.total}), 0)`,
    })
    .from(billItems)
    .innerJoin(bills, eq(bills.id, billItems.billId))
    .leftJoin(menuItems, eq(menuItems.id, billItems.menuItemId))
    .leftJoin(categories, eq(categories.id, menuItems.categoryId))
    .where(and(...window(ctx)))
    .groupBy(categories.id, categories.name)
    .orderBy(desc(sql`3`));
  const total = data.reduce((acc, r) => acc.plus(r.revenue), new D(0)).toFixed(2);
  const rows = data.map((r) => ({ name: r.name, qty: qty(r.qty), revenue: money(r.revenue), share: share(r.revenue, total) }));
  return base("category", ctx, {
    columns: [
      { key: "name", label: "Category", format: "text" },
      { key: "qty", label: "Items sold", format: "number" },
      { key: "revenue", label: "Revenue", format: "money" },
      { key: "share", label: "Share", format: "percent" },
    ],
    rows,
    totals: { qty: sumQty(rows, "qty"), revenue: total, share: rows.length ? "100.0" : "0.0" },
    chart: { type: "bar", labelKey: "name", valueKey: "revenue", valueLabel: "Revenue", format: "money" },
  });
}

// ---- By item ---------------------------------------------------------------
async function byItem(ctx: ReportContext): Promise<ReportData> {
  const name = sql<string>`coalesce(${menuItems.name}, ${billItems.name})`;
  const data = await db
    .select({
      name,
      category: sql<string>`coalesce(${categories.name}, 'Other')`,
      qty: sql<string>`coalesce(sum(${billItems.quantity}), 0)`,
      revenue: sql<string>`coalesce(sum(${billItems.total}), 0)`,
    })
    .from(billItems)
    .innerJoin(bills, eq(bills.id, billItems.billId))
    .leftJoin(menuItems, eq(menuItems.id, billItems.menuItemId))
    .leftJoin(categories, eq(categories.id, menuItems.categoryId))
    .where(and(...window(ctx)))
    .groupBy(name, categories.name)
    .orderBy(desc(sql`4`), asc(sql`1`))
    .limit(ROW_LIMIT + 1);
  const total = data.reduce((acc, r) => acc.plus(r.revenue), new D(0)).toFixed(2);
  const rows = data.map((r) => ({ name: r.name, category: r.category, qty: qty(r.qty), revenue: money(r.revenue), share: share(r.revenue, total) }));
  return base("item", ctx, {
    columns: [
      { key: "name", label: "Item", format: "text" },
      { key: "category", label: "Category", format: "text" },
      { key: "qty", label: "Qty sold", format: "number" },
      { key: "revenue", label: "Revenue", format: "money" },
      { key: "share", label: "Share", format: "percent" },
    ],
    rows,
    totals: { qty: sumQty(rows, "qty"), revenue: sumColumn(rows, "revenue") },
    chart: { type: "bar", labelKey: "name", valueKey: "revenue", valueLabel: "Revenue", format: "money" },
  });
}

// ---- By cashier ------------------------------------------------------------
async function byCashier(ctx: ReportContext): Promise<ReportData> {
  const data = await db
    .select({
      name: sql<string>`coalesce(${users.name}, 'Removed user')`,
      bills: sql<number>`count(*)`.mapWith(Number),
      discount: sql<string>`coalesce(sum(${bills.totalDiscount}), 0)`,
      total: sql<string>`coalesce(sum(${bills.totalAmount}), 0)`,
    })
    .from(bills)
    .leftJoin(users, eq(users.id, bills.createdUserId))
    .where(and(...window(ctx)))
    .groupBy(users.id, users.name)
    .orderBy(desc(sql`4`));
  const rows = data.map((r) => ({
    name: r.name,
    bills: String(r.bills),
    discount: money(r.discount),
    total: money(r.total),
    average: r.bills > 0 ? new D(r.total).div(r.bills).toFixed(2) : "0.00",
  }));
  const totalBills = data.reduce((n, r) => n + r.bills, 0);
  const total = sumColumn(rows, "total");
  return base("cashier", ctx, {
    columns: [
      { key: "name", label: "Cashier", format: "text" },
      { key: "bills", label: "Bills", format: "number" },
      { key: "discount", label: "Discount given", format: "money" },
      { key: "total", label: "Total", format: "money" },
      { key: "average", label: "Avg bill", format: "money" },
    ],
    rows,
    totals: { bills: String(totalBills), discount: sumColumn(rows, "discount"), total, average: totalBills > 0 ? new D(total).div(totalBills).toFixed(2) : "0.00" },
    chart: { type: "bar", labelKey: "name", valueKey: "total", valueLabel: "Total", format: "money" },
  });
}

// ---- By payment method -----------------------------------------------------
const METHOD_LABELS: Record<string, string> = { cash: "Cash", card: "Card", upi: "UPI", other: "Other" };

async function byPayment(ctx: ReportContext): Promise<ReportData> {
  const data = await db
    .select({
      method: payments.method,
      bills: sql<number>`count(distinct ${payments.billId})`.mapWith(Number),
      amount: sql<string>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(bills, eq(bills.id, payments.billId))
    .where(and(...window(ctx)))
    .groupBy(payments.method)
    .orderBy(desc(sql`3`));
  const total = data.reduce((acc, r) => acc.plus(r.amount), new D(0)).toFixed(2);
  const rows = data.map((r) => ({ method: METHOD_LABELS[r.method] ?? r.method, bills: String(r.bills), amount: money(r.amount), share: share(r.amount, total) }));
  return base("payment", ctx, {
    columns: [
      { key: "method", label: "Method", format: "text" },
      { key: "bills", label: "Bills", format: "number" },
      { key: "amount", label: "Amount", format: "money" },
      { key: "share", label: "Share", format: "percent" },
    ],
    rows,
    // A bill paid with two methods is counted under each, so the bill counts are not summed.
    totals: { amount: total, share: rows.length ? "100.0" : "0.0" },
    chart: { type: "bar", labelKey: "method", valueKey: "amount", valueLabel: "Amount", format: "money" },
  });
}

// ---- Tax -------------------------------------------------------------------
async function tax(ctx: ReportContext): Promise<ReportData> {
  // Same rule as a bill line: taxable = price x quantity - discount, tax rounded to 2 dp per line.
  // Bills saved with tax ignored have no tax at all, so they are left out.
  const taxable = sql`(${billItems.price} * ${billItems.quantity} - ${billItems.discount})`;
  const data = await db
    .select({
      sgstRate: billItems.sgst,
      cgstRate: billItems.cgst,
      taxable: sql<string>`coalesce(sum(${taxable}), 0)`,
      sgst: sql<string>`coalesce(sum(round(${taxable} * ${billItems.sgst} / 100, 2)), 0)`,
      cgst: sql<string>`coalesce(sum(round(${taxable} * ${billItems.cgst} / 100, 2)), 0)`,
    })
    .from(billItems)
    .innerJoin(bills, eq(bills.id, billItems.billId))
    .where(and(...window(ctx), gt(bills.totalTax, "0")))
    .groupBy(billItems.sgst, billItems.cgst)
    .orderBy(asc(billItems.sgst), asc(billItems.cgst));
  const rows = data.map((r) => {
    const totalTax = new D(r.sgst).plus(r.cgst);
    return {
      rate: `${new D(r.sgstRate).toString()}% + ${new D(r.cgstRate).toString()}%`,
      taxable: money(r.taxable),
      sgst: money(r.sgst),
      cgst: money(r.cgst),
      tax: totalTax.toFixed(2),
      total: new D(r.taxable).plus(totalTax).toFixed(2),
    };
  });
  return base("tax", ctx, {
    columns: [
      { key: "rate", label: "Rate (SGST + CGST)", format: "text" },
      { key: "taxable", label: "Taxable value", format: "money" },
      { key: "sgst", label: "SGST", format: "money" },
      { key: "cgst", label: "CGST", format: "money" },
      { key: "tax", label: "Total tax", format: "money" },
      { key: "total", label: "Total", format: "money" },
    ],
    rows,
    totals: { taxable: sumColumn(rows, "taxable"), sgst: sumColumn(rows, "sgst"), cgst: sumColumn(rows, "cgst"), tax: sumColumn(rows, "tax"), total: sumColumn(rows, "total") },
    chart: { type: "bar", labelKey: "rate", valueKey: "tax", valueLabel: "Tax collected", format: "money" },
  });
}

// ---- Discounts -------------------------------------------------------------
async function discounts(ctx: ReportContext): Promise<ReportData> {
  const where = and(...window(ctx), gt(bills.totalDiscount, "0"));
  const local = localTime(ctx.timeZone);
  const [data, daily] = await Promise.all([
    db
      .select({
        billNo: bills.billNo,
        day: sql<string>`to_char(${local}, 'YYYY-MM-DD')`,
        cashier: sql<string>`coalesce(${users.name}, 'Removed user')`,
        subtotal: bills.subtotal,
        discount: bills.totalDiscount,
        total: bills.totalAmount,
      })
      .from(bills)
      .leftJoin(users, eq(users.id, bills.createdUserId))
      .where(where)
      .orderBy(desc(bills.createdAt))
      .limit(ROW_LIMIT + 1),
    db
      .select({ day: sql<string>`to_char(${local}, 'YYYY-MM-DD')`, discount: sql<string>`coalesce(sum(${bills.totalDiscount}), 0)`, bills: sql<number>`count(*)`.mapWith(Number) })
      .from(bills)
      .where(where)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);
  const dayLabel = (d: string) => label(d, { day: "numeric", month: "short" }, ctx.locale);
  const rows = data.map((r) => ({
    billNo: r.billNo,
    date: label(r.day, { day: "numeric", month: "short", year: "numeric" }, ctx.locale),
    cashier: r.cashier,
    subtotal: money(r.subtotal),
    discount: money(r.discount),
    percent: share(r.discount, r.subtotal),
    total: money(r.total),
  }));
  // Totals and the chart come from the full period, not the capped list.
  const totalDiscount = daily.reduce((acc, r) => acc.plus(r.discount), new D(0)).toFixed(2);
  const totalBills = daily.reduce((n, r) => n + r.bills, 0);
  return base("discount", ctx, {
    columns: [
      { key: "billNo", label: "Bill", format: "text" },
      { key: "date", label: "Date", format: "text" },
      { key: "cashier", label: "Cashier", format: "text" },
      { key: "subtotal", label: "Subtotal", format: "money" },
      { key: "discount", label: "Discount", format: "money" },
      { key: "percent", label: "% of subtotal", format: "percent" },
      { key: "total", label: "Total", format: "money" },
    ],
    rows,
    totals: { billNo: `${totalBills} bills`, discount: totalDiscount },
    chart: { type: "bar", labelKey: "day", valueKey: "discount", valueLabel: "Discount given", format: "money" },
    chartRows: daily.map((r) => ({ day: dayLabel(r.day), discount: money(r.discount) })),
  });
}

// ---- Inventory valuation ---------------------------------------------------
async function valuation(ctx: ReportContext | null): Promise<ReportData> {
  const data = await db
    .select({
      name: menuItems.name,
      category: categories.name,
      unit: menuItems.unit,
      stock: menuItems.stockQty,
      cost: menuItems.costPrice,
      value: sql<string>`greatest(${menuItems.stockQty}, 0) * ${menuItems.costPrice}`,
    })
    .from(menuItems)
    .innerJoin(categories, eq(categories.id, menuItems.categoryId))
    .where(and(eq(menuItems.trackStock, true), sql`${menuItems.deletedAt} is null`))
    .orderBy(desc(sql`6`), asc(menuItems.name))
    .limit(ROW_LIMIT + 1);
  const rows = data.map((r) => ({ name: r.name, category: r.category, unit: r.unit, stock: qty(r.stock), cost: money(r.cost), value: money(r.value) }));
  const byCat = new Map<string, Dec>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? new D(0)).plus(r.value));
  const chartRows = [...byCat].sort((a, b) => b[1].comparedTo(a[1])).map(([category, v]) => ({ category, value: v.toFixed(2) }));
  return base("valuation", ctx, {
    columns: [
      { key: "name", label: "Item", format: "text" },
      { key: "category", label: "Category", format: "text" },
      { key: "stock", label: "On hand", format: "number" },
      { key: "unit", label: "Unit", format: "text" },
      { key: "cost", label: "Cost each", format: "money" },
      { key: "value", label: "Value", format: "money" },
    ],
    rows,
    totals: { value: sumColumn(rows, "value") },
    chart: { type: "bar", labelKey: "category", valueKey: "value", valueLabel: "Stock value", format: "money" },
    chartRows,
  });
}

// ---- Stock movement --------------------------------------------------------
async function movements(ctx: ReportContext): Promise<ReportData> {
  const sum = (reasons: string[], sign: 1 | -1) =>
    sql<string>`coalesce(sum(case when ${inArray(stockMovements.reason, reasons as never)} then ${sign === 1 ? sql`${stockMovements.delta}` : sql`-${stockMovements.delta}`} else 0 end), 0)`;
  const data = await db
    .select({
      name: menuItems.name,
      unit: menuItems.unit,
      purchased: sum(["purchase"], 1),
      sold: sum(["sale", "void", "refund"], -1),
      wasted: sum(["wastage", "damage"], -1),
      adjusted: sum(["correction", "return"], 1),
      net: sql<string>`coalesce(sum(${stockMovements.delta}), 0)`,
    })
    .from(stockMovements)
    .innerJoin(menuItems, eq(menuItems.id, stockMovements.menuItemId))
    .where(
      and(
        gte(stockMovements.createdAt, zonedStartOfDay(ctx.range.from, ctx.timeZone)),
        lt(stockMovements.createdAt, zonedStartOfDay(nextDay(ctx.range.to), ctx.timeZone)),
      ),
    )
    .groupBy(menuItems.id, menuItems.name, menuItems.unit)
    .orderBy(desc(sql`4`), asc(menuItems.name))
    .limit(ROW_LIMIT + 1);
  const rows = data.map((r) => ({ name: r.name, unit: r.unit, purchased: qty(r.purchased), sold: qty(r.sold), wasted: qty(r.wasted), adjusted: qty(r.adjusted), net: qty(r.net) }));
  const col = (key: string) => sumQty(rows, key);
  return base("movements", ctx, {
    columns: [
      { key: "name", label: "Item", format: "text" },
      { key: "unit", label: "Unit", format: "text" },
      { key: "purchased", label: "Received", format: "number" },
      { key: "sold", label: "Sold (net)", format: "number" },
      { key: "wasted", label: "Wasted", format: "number" },
      { key: "adjusted", label: "Corrections & returns", format: "number" },
      { key: "net", label: "Net change", format: "number" },
    ],
    rows,
    totals: { purchased: col("purchased"), sold: col("sold"), wasted: col("wasted"), adjusted: col("adjusted"), net: col("net") },
    chart: { type: "bar", labelKey: "name", valueKey: "sold", valueLabel: "Sold (net)", format: "number" },
  });
}

export async function getReport(kind: ReportKind, ctx: ReportContext): Promise<ReportData> {
  switch (kind) {
    case "sales": return sales(ctx);
    case "category": return byCategory(ctx);
    case "item": return byItem(ctx);
    case "cashier": return byCashier(ctx);
    case "payment": return byPayment(ctx);
    case "tax": return tax(ctx);
    case "discount": return discounts(ctx);
    case "valuation": return valuation(ctx);
    case "movements": return movements(ctx);
  }
}

export type { ReportColumn };
