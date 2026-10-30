import { formatDateTime } from "@/lib/format";
import { D, round2 } from "@/lib/money";
import { savedLineTax } from "@/services/calculations";
import type { BillStatus } from "@/types/bill";

export const EXPORT_HEADER = ["Bill ID", "Date", "Customer", "Item", "Qty", "Currency", "Price", "Tax", "Total", "Status"] as const;
/** Columns holding amounts, which the XLSX export writes as numbers. */
export const EXPORT_NUMERIC_COLUMNS = [4, 6, 7, 8] as const;

export interface ExportBill {
  billNo: string;
  createdAt: Date;
  currency: string;
  status: BillStatus;
  customerName: string | null;
  totalTax: string;
  items: Array<{ name: string; quantity: string; price: string; discount: string; sgst: string; cgst: string; total: string }>;
}

/**
 * One row per bill line: Bill ID, Date, Customer, Item, Qty, Currency, Price (before tax),
 * Tax (for the line) and Total (line, after discount and tax), plus the bill's Status.
 */
export function buildExportRows(
  bills: ExportBill[],
  options: { timeZone: string; locale: string; walkInLabel: string },
): string[][] {
  const rows: string[][] = [];
  for (const bill of bills) {
    const taxCharged = new D(bill.totalTax).greaterThan(0);
    const date = formatDateTime(bill.createdAt, { locale: options.locale, timeZone: options.timeZone });
    for (const item of bill.items) {
      rows.push([
        bill.billNo,
        date,
        bill.customerName ?? options.walkInLabel,
        item.name,
        new D(item.quantity).toString(),
        bill.currency,
        round2(item.price).toFixed(2),
        savedLineTax(item, taxCharged).tax,
        round2(item.total).toFixed(2),
        bill.status,
      ]);
    }
  }
  return rows;
}
