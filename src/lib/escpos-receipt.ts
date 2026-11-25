/**
 * Lays out a bill as ESC/POS bytes: the customer receipt and the kitchen slip,
 * each ending with its own paper cut so one print job yields two separate pieces of paper.
 */
import { concatBytes, EscPosBuilder, paperColumns, toPrinterText, wrapText } from "@/lib/escpos";
import { D } from "@/lib/money";
import {
  buildKitchenSlipModel,
  buildReceiptModel,
  money,
  type KitchenSlipModel,
  type ReceiptModel,
} from "@/lib/receipt";
import type { BillDetail } from "@/types/bill";
import type { AppSettings } from "@/types/settings";

export function receiptToEscPos(model: ReceiptModel): Uint8Array {
  const p = new EscPosBuilder(paperColumns(model.paperSize));
  const m = (value: string) => money(model, value);

  p.init().align("center");
  p.bold(true);
  if (model.businessName.length <= p.columns / 2) p.size(2, 2).line(model.businessName).size(1, 1);
  else p.line(model.businessName);
  p.bold(false);
  for (const line of model.addressLines) p.line(line);
  if (model.phone) p.line(`Phone: ${model.phone}`);
  if (model.gstin) p.line(`GSTIN: ${model.gstin}`);
  if (model.headerText) p.line(model.headerText);
  p.align("left").rule();

  if (model.statusNote)
    p.align("center").bold(true).size(2, 2).line(model.statusNote).size(1, 1).bold(false).align("left");
  p.row("Bill no", model.billNo);
  p.row("Date", model.dateText);
  p.row("Customer", model.customerName);
  if (model.customerPhone) p.row("Phone", model.customerPhone);
  if (model.cashierName) p.row("Cashier", model.cashierName);
  if (model.orderLine) p.row("Order", model.orderLine);
  p.rule();

  p.bold(true).row("Item", "Amount").bold(false);
  for (const item of model.items) {
    p.row(item.name, m(item.amount));
    p.line(`  ${item.quantity} x ${m(item.unitPrice)}`);
    // Each add-on on its own indented line, with its price at the right like the item's.
    for (const extra of item.extras) p.row(`  ${extra.label}`, m(extra.amount));
    if (item.note) p.line(`  ${item.note}`);
  }
  p.rule();

  p.row("Items", String(model.itemCount));
  p.row("Subtotal", m(model.totals.subtotal));
  if (new D(model.totals.discount).greaterThan(0)) p.row("Discount", `-${m(model.totals.discount)}`);
  if (model.showTax) {
    p.row("SGST", m(model.totals.sgst));
    p.row("CGST", m(model.totals.cgst));
  }
  p.rule();
  p.bold(true).size(1, 2).row("TOTAL", m(model.totals.total)).size(1, 1).bold(false);
  p.rule();

  for (const pay of model.payments) {
    p.row(`Paid by ${pay.label}${pay.reference ? ` (${pay.reference})` : ""}`, m(pay.amount));
  }
  if (model.received) p.row("Cash received", m(model.received));
  if (model.change) p.row("Change", m(model.change));
  if (model.notes) for (const l of wrapText(`Note: ${model.notes}`, p.columns)) p.line(l);

  if (model.footerText) {
    p.rule().align("center");
    for (const l of wrapText(model.footerText, p.columns)) p.line(l);
  }

  return p.feed(2).cut().build();
}

export function kitchenSlipToEscPos(model: KitchenSlipModel, columns: number): Uint8Array {
  const p = new EscPosBuilder(columns);
  // Items print at normal width and double height: easy to read, and a full line of characters.

  p.init().align("center").bold(true).size(2, 2).line("KITCHEN").size(1, 1).bold(false);
  p.align("left").rule();
  // On a running order's slip the time shares the "KOT #" line: plain receipt text at the left, the large
  // number at the right; otherwise it gets its own line below. Width is unchanged by the taller size, so the
  // gap is counted in ordinary characters.
  if (model.kotLabel) {
    const date = toPrinterText(model.dateText);
    const gap = Math.max(1, columns - model.kotLabel.length - date.length);
    p.size(1, 1)
      .bold(false)
      .text(`${date}${" ".repeat(gap)}`)
      .bold(true)
      .size(1, 2)
      .line(model.kotLabel);
  }
  // Order type and table in the plain text the receipt footer uses, then the short order number in bold on
  // the same line (the last line, if the order type wraps).
  p.size(1, 1).bold(false);
  const orderNo = model.orderNo ?? "";
  const orderLines = model.orderLine
    ? wrapText(model.orderLine, Math.max(1, columns - (orderNo ? orderNo.length + 1 : 0)))
    : [];
  if (orderLines.length === 0 && orderNo) p.bold(true).line(orderNo).bold(false);
  orderLines.forEach((l, i) => {
    if (orderNo && i === orderLines.length - 1) {
      p.text(`${l}${" ".repeat(Math.max(1, columns - l.length - orderNo.length))}`)
        .bold(true)
        .line(orderNo)
        .bold(false);
    } else {
      p.line(l);
    }
  });
  if (!model.kotLabel) p.line(model.dateText);
  p.rule();

  for (const item of model.items) {
    const lines = wrapText(`${item.quantity} x ${item.name}`, columns);
    p.bold(true).size(1, 2);
    for (const l of lines) p.line(l);
    p.size(1, 1).bold(false);
    for (const detail of item.details) for (const l of wrapText(detail, columns - 4)) p.line(`    ${l}`);
  }
  if (model.notes) {
    p.rule();
    for (const l of wrapText(`Note: ${model.notes}`, columns)) p.line(l);
  }

  return p.feed(2).cut().build();
}

export interface PrintJobOptions {
  /** The kitchen slip for the whole bill (a reprint from history). */
  kitchen?: boolean;
  /** The kitchen slip for one send of a running order, by its number. */
  kot?: number;
  /** Set false to leave the customer receipt out (a kitchen-only print). Defaults to true. */
  receipt?: boolean;
}

/** The whole print job for a bill: the receipt, then (optionally) a kitchen slip, each followed by a cut. */
export function buildPrintJob(bill: BillDetail, settings: AppSettings, options: PrintJobOptions): Uint8Array {
  const columns = paperColumns(settings.receipt.paperSize);
  const parts: Uint8Array[] = [];
  if (options.receipt !== false) parts.push(receiptToEscPos(buildReceiptModel(bill, settings)));
  if (options.kot !== undefined) {
    const kot = bill.kots.find((k) => k.seq === options.kot);
    if (kot) parts.push(kitchenSlipToEscPos(buildKitchenSlipModel(bill, settings, kot), columns));
  } else if (options.kitchen) {
    parts.push(kitchenSlipToEscPos(buildKitchenSlipModel(bill, settings), columns));
  }
  return concatBytes(parts);
}
