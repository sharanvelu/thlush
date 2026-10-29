/**
 * One description of a receipt, shared by the printed page, the PDF and the
 * WhatsApp/email text, so the three can never disagree.
 */
import { formatDateTime } from "@/lib/format";
import { D, formatMoney, round2 } from "@/lib/money";
import { unitPriceInclTax } from "@/services/calculations";
import type { AppSettings, PaperSize } from "@/types/settings";
import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, type BillDetail } from "@/types/bill";

export interface ReceiptTotals {
  /** Sum of price x quantity, before discounts and tax. */
  subtotal: string;
  discount: string;
  sgst: string;
  cgst: string;
  tax: string;
  total: string;
}

/**
 * SGST and CGST are not stored per bill, so they are rebuilt from the saved
 * snapshot: taxable = price x qty - discount, tax = taxable x rate. This is the
 * same rule `calculateBill` used when the bill was saved.
 */
export function receiptTotals(bill: BillDetail): ReceiptTotals {
  let subtotal = new D(0);
  let sgst = new D(0);
  let cgst = new D(0);
  for (const item of bill.items) {
    const gross = round2(new D(item.price).times(item.quantity));
    subtotal = subtotal.plus(gross);
    const taxable = gross.minus(item.discount);
    sgst = sgst.plus(round2(taxable.times(item.sgst).div(100)));
    cgst = cgst.plus(round2(taxable.times(item.cgst).div(100)));
  }

  const savedTax = new D(bill.totalTax);
  // Tax-free bills (the business ignores tax) keep rates on the items but charged nothing.
  if (savedTax.isZero()) {
    sgst = new D(0);
    cgst = new D(0);
  } else if (!sgst.plus(cgst).equals(savedTax)) {
    // Should not happen; keep the printed total honest by splitting the saved tax evenly.
    sgst = round2(savedTax.div(2));
    cgst = savedTax.minus(sgst);
  }

  return {
    subtotal: subtotal.toFixed(2),
    discount: round2(bill.totalDiscount).toFixed(2),
    sgst: sgst.toFixed(2),
    cgst: cgst.toFixed(2),
    tax: savedTax.toFixed(2),
    total: round2(bill.totalAmount).toFixed(2),
  };
}

export interface ReceiptItemRow {
  name: string;
  quantity: string;
  /** Unit price including tax, before any discount. */
  unitPrice: string;
  /** Line amount after discount, including tax. The rows add up to the total. */
  amount: string;
  /** e.g. "Discount -10.00", when the line was discounted. */
  note: string | null;
}

export interface ReceiptModel {
  paperSize: PaperSize;
  currency: string;
  locale: string;
  businessName: string;
  addressLines: string[];
  phone: string;
  gstin: string;
  headerText: string;
  footerText: string;
  billNo: string;
  dateText: string;
  customerName: string;
  customerPhone: string | null;
  cashierName: string | null;
  orderLine: string | null;
  statusNote: string | null;
  notes: string | null;
  items: ReceiptItemRow[];
  itemCount: number;
  totals: ReceiptTotals;
  showTax: boolean;
  payments: Array<{ label: string; amount: string; reference: string | null }>;
  received: string | null;
  change: string | null;
}

const trimQty = (q: string) => new D(q).toString();

export function buildReceiptModel(bill: BillDetail, settings: AppSettings): ReceiptModel {
  const { locale, currency, timezone } = settings.locale;
  const totals = receiptTotals(bill);
  const showTax = !settings.tax.ignoreTax || new D(bill.totalTax).greaterThan(0);

  const orderBits = [
    bill.orderType ? ORDER_TYPE_LABELS[bill.orderType] : null,
    bill.tableNo ? `Table ${bill.tableNo}` : null,
  ].filter(Boolean);

  const change = new D(bill.changeDue);
  const statusNote =
    bill.status === "void" ? "VOIDED" : bill.status === "refunded" ? "REFUNDED" : bill.status === "held" ? "ON HOLD" : null;

  return {
    paperSize: settings.receipt.paperSize,
    currency: bill.currency || currency,
    locale,
    businessName: settings.business.name,
    addressLines: settings.business.address.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    phone: settings.business.phone,
    gstin: settings.business.gstin,
    headerText: settings.receipt.header,
    footerText: settings.receipt.footer,
    billNo: bill.billNo,
    dateText: formatDateTime(bill.createdAt, { locale, timeZone: timezone }),
    customerName: bill.customer?.name ?? (settings.billing.defaultCustomerName || "Walk-in Customer"),
    customerPhone: bill.customer?.phone ?? null,
    cashierName: bill.cashier?.name ?? null,
    orderLine: orderBits.length > 0 ? orderBits.join(" · ") : null,
    statusNote,
    notes: bill.notes,
    items: bill.items.map((item) => ({
      name: item.name,
      quantity: trimQty(item.quantity),
      unitPrice: unitPriceInclTax(item.price, item.sgst, item.cgst, !showTax),
      amount: round2(item.total).toFixed(2),
      note: new D(item.discount).greaterThan(0) ? `Discount -${round2(item.discount).toFixed(2)}` : null,
    })),
    itemCount: bill.items.reduce((acc, i) => acc.plus(i.quantity), new D(0)).toNumber(),
    totals,
    showTax,
    payments: bill.payments.map((p) => ({
      label: PAYMENT_METHOD_LABELS[p.method],
      amount: round2(p.amount).toFixed(2),
      reference: p.reference,
    })),
    received: change.greaterThan(0) ? round2(bill.amountPaid).toFixed(2) : null,
    change: change.greaterThan(0) ? change.toFixed(2) : null,
  };
}

export function money(model: Pick<ReceiptModel, "currency" | "locale">, value: string, plain = true): string {
  return formatMoney(value, { currency: model.currency, locale: model.locale, plain });
}

/** Plain-text receipt for WhatsApp and email. */
export function receiptText(model: ReceiptModel): string {
  const m = (v: string) => formatMoney(v, { currency: model.currency, locale: model.locale, display: "code" });
  const lines: string[] = [];
  lines.push(model.businessName);
  if (model.addressLines.length > 0) lines.push(...model.addressLines);
  if (model.phone) lines.push(`Phone: ${model.phone}`);
  if (model.gstin) lines.push(`GSTIN: ${model.gstin}`);
  lines.push("", `Bill ${model.billNo}`, model.dateText, `Customer: ${model.customerName}`);
  if (model.orderLine) lines.push(model.orderLine);
  lines.push("", "Items");
  for (const item of model.items) lines.push(`- ${item.name} x ${item.quantity}  ${m(item.amount)}`);
  lines.push("");
  lines.push(`Subtotal: ${m(model.totals.subtotal)}`);
  if (new D(model.totals.discount).greaterThan(0)) lines.push(`Discount: -${m(model.totals.discount)}`);
  if (model.showTax) {
    lines.push(`SGST: ${m(model.totals.sgst)}`, `CGST: ${m(model.totals.cgst)}`);
  }
  lines.push(`Total: ${m(model.totals.total)}`);
  for (const p of model.payments) lines.push(`Paid by ${p.label}: ${m(p.amount)}`);
  if (model.footerText) lines.push("", model.footerText);
  return lines.join("\n");
}

/** wa.me link: opens WhatsApp with the receipt text, addressed to the customer's number if known. */
export function whatsappUrl(model: ReceiptModel): string {
  const digits = (model.customerPhone ?? "").replace(/\D/g, "");
  // A bare 10-digit number is assumed to be Indian; anything longer is taken as already international.
  const number = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(receiptText(model))}`;
}

export function mailtoUrl(model: ReceiptModel, email: string | null): string {
  const subject = `Receipt ${model.billNo} from ${model.businessName}`;
  return `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(receiptText(model))}`;
}
