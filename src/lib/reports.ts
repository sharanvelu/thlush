import { z } from "zod";
import { toCsv, type CsvCell } from "@/lib/csv";
import { D, formatMoney } from "@/lib/money";

export const REPORT_KINDS = ["sales", "category", "item", "cashier", "payment", "tax", "discount", "valuation", "movements"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_META: Record<ReportKind, { label: string; title: string; description: string; usesRange: boolean; needsInventory: boolean }> = {
  sales: { label: "Sales", title: "Sales summary", description: "Completed bills grouped by day, week or month.", usesRange: true, needsInventory: false },
  category: { label: "By category", title: "Sales by category", description: "What each menu category brought in.", usesRange: true, needsInventory: false },
  item: { label: "By item", title: "Sales by item", description: "Quantity and revenue for every item sold, best sellers first.", usesRange: true, needsInventory: false },
  cashier: { label: "By cashier", title: "Sales by cashier", description: "Bills and revenue for each person who billed.", usesRange: true, needsInventory: false },
  payment: { label: "By payment", title: "Sales by payment method", description: "How customers paid.", usesRange: true, needsInventory: false },
  tax: { label: "Tax", title: "Tax report", description: "SGST and CGST collected, grouped by tax rate.", usesRange: true, needsInventory: false },
  discount: { label: "Discounts", title: "Discount report", description: "Every completed bill that had a discount.", usesRange: true, needsInventory: false },
  valuation: { label: "Stock value", title: "Inventory valuation", description: "Stock on hand today, valued at cost.", usesRange: false, needsInventory: true },
  movements: { label: "Stock movement", title: "Stock movement", description: "What came in and went out of stock, per item.", usesRange: true, needsInventory: true },
};

export const GROUPS = ["day", "week", "month"] as const;
export type Group = (typeof GROUPS)[number];

export const reportQuerySchema = z.object({
  r: z.enum(REPORT_KINDS).catch("sales").default("sales"),
  range: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  group: z.enum(GROUPS).catch("day").default("day"),
});
export type ReportQuery = z.output<typeof reportQuerySchema>;

export const reportExportQuerySchema = reportQuerySchema.extend({
  format: z.enum(["csv", "pdf"]).catch("csv").default("csv"),
});

export type ColumnFormat = "text" | "money" | "number" | "percent";

export interface ReportColumn {
  key: string;
  label: string;
  format: ColumnFormat;
}

export interface ReportChart {
  type: "area" | "bar";
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  format: "money" | "number";
}

export interface ReportData {
  kind: ReportKind;
  title: string;
  description: string;
  /** Period covered, e.g. "1 Oct 2026 to 30 Oct 2026". Null for reports that are a snapshot of today. */
  period: string | null;
  columns: ReportColumn[];
  rows: Array<Record<string, string>>;
  /** Sums for the numeric columns that can be summed. */
  totals: Record<string, string> | null;
  chart: ReportChart | null;
  /** Rows the chart draws when they differ from the table (e.g. per day while the table lists bills). */
  chartRows?: Array<Record<string, string>>;
  /** True when the table was cut at the row limit. */
  truncated: boolean;
}

export const ROW_LIMIT = 500;

/** Percentage of `part` in `whole` with one decimal, as a string. "0.0" when there is no whole. */
export function share(part: string | number, whole: string | number): string {
  const w = new D(whole);
  return w.isZero() ? "0.0" : new D(part).div(w).times(100).toDecimalPlaces(1).toFixed(1);
}

export function sumColumn(rows: Array<Record<string, string>>, key: string, places = 2): string {
  return rows.reduce((acc, r) => acc.plus(r[key] ?? 0), new D(0)).toFixed(places);
}

/** A cell as the screen shows it. */
export function formatCell(value: string | undefined, format: ColumnFormat, fmt: { currency: string; locale: string }): string {
  if (value === undefined || value === "") return "";
  if (format === "money") return formatMoney(value, fmt);
  if (format === "percent") return `${value}%`;
  if (format === "number") return new Intl.NumberFormat(fmt.locale, { maximumFractionDigits: 3 }).format(Number(value));
  return value;
}

/** Plain numbers for files: no currency symbol, no thousands separators, so spreadsheets read them as numbers. */
export function reportToCsv(report: ReportData): string {
  const header: CsvCell[] = report.columns.map((c) => c.label);
  const body: CsvCell[][] = report.rows.map((r) => report.columns.map((c) => r[c.key] ?? ""));
  const totals: CsvCell[][] = report.totals ? [report.columns.map((c, i) => (i === 0 ? "Total" : (report.totals?.[c.key] ?? "")))] : [];
  return `﻿${toCsv([header, ...body, ...totals])}`;
}

export function exportFileName(kind: ReportKind, from: string | null, to: string | null, ext: string): string {
  const range = from && to ? `${from}_to_${to}` : new Date().toISOString().slice(0, 10);
  return `report-${kind}-${range}.${ext}`;
}
