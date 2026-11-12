/**
 * Lays out a bill as ESC/POS bytes: the customer receipt and the kitchen slip,
 * each ending with its own paper cut so one print job yields two separate pieces of paper.
 */
import { EscPosBuilder, paperColumns, wrapText } from "@/lib/escpos";
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

  if (model.statusNote) p.align("center").bold(true).size(2, 2).line(model.statusNote).size(1, 1).bold(false).align("left");
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
  // Items print at double width, so they get half as many characters per line.
  const bigWidth = Math.floor(columns / 2);

  p.init().align("center").bold(true).size(2, 2).line("KITCHEN").size(1, 1).bold(false);
  p.align("left").rule();
  p.bold(true).size(1, 2).line(model.billNo);
  if (model.orderLine) for (const l of wrapText(model.orderLine, columns)) p.line(l);
  p.size(1, 1).bold(false).line(model.dateText);
  p.rule();

  for (const item of model.items) {
    const lines = wrapText(`${item.quantity} x ${item.name}`, bigWidth);
    p.bold(true).size(2, 2);
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

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** The whole print job for a bill: the receipt, then (optionally) the kitchen slip, each followed by a cut. */
export function buildPrintJob(bill: BillDetail, settings: AppSettings, options: { kitchen: boolean }): Uint8Array {
  const parts = [receiptToEscPos(buildReceiptModel(bill, settings))];
  if (options.kitchen) {
    parts.push(kitchenSlipToEscPos(buildKitchenSlipModel(bill, settings), paperColumns(settings.receipt.paperSize)));
  }
  return concat(parts);
}
