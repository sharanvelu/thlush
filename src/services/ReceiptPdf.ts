import PDFDocument from "pdfkit";
import { D, formatMoney } from "@/lib/money";
import type { ReceiptModel } from "@/lib/receipt";

/** Receipt paper widths in PDF points (1 mm = 2.8346 pt). */
const WIDTH: Record<ReceiptModel["paperSize"], number> = { "80mm": 226.77, "58mm": 164.41 };
const MARGIN = 10;

type Doc = InstanceType<typeof PDFDocument>;

/**
 * Draws the receipt and returns the y position where it ended. Called twice:
 * once on a tall scratch page to measure, then on a page cut to that height.
 */
function draw(doc: Doc, model: ReceiptModel): number {
  const width = WIDTH[model.paperSize];
  const inner = width - MARGIN * 2;
  const wide = model.paperSize === "80mm";
  // The built-in fonts have no rupee glyph, so amounts are printed as numbers and totals use the currency code.
  const num = (v: string) => formatMoney(v, { currency: model.currency, locale: model.locale, plain: true });

  let y = MARGIN;
  const center = (text: string, size = 8, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
    doc.text(text, MARGIN, y, { width: inner, align: "center" });
    y = doc.y + 1;
  };
  const rule = () => {
    y += 2;
    doc.save().lineWidth(0.5).dash(2, { space: 2 }).moveTo(MARGIN, y).lineTo(width - MARGIN, y).stroke().restore();
    y += 4;
  };
  const row = (left: string, right: string, bold = false, size = 8) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
    doc.text(left, MARGIN, y, { width: inner * 0.62, align: "left", lineBreak: false });
    doc.text(right, MARGIN, y, { width: inner, align: "right", lineBreak: false });
    y += doc.currentLineHeight() + 2;
  };

  center(model.businessName, 11, true);
  for (const line of model.addressLines) center(line);
  if (model.phone) center(`Phone: ${model.phone}`);
  if (model.gstin) center(`GSTIN: ${model.gstin}`);
  if (model.headerText) center(model.headerText);
  rule();

  if (model.statusNote) center(model.statusNote, 10, true);
  row("Bill no", model.billNo, true);
  row("Date", model.dateText);
  row("Customer", model.customerName);
  if (model.customerPhone) row("Phone", model.customerPhone);
  if (model.cashierName) row("Cashier", model.cashierName);
  if (model.orderLine) row("Order", model.orderLine);
  rule();

  // Item table: name | qty | price | amount
  const qtyW = 22;
  const priceW = wide ? 44 : 0;
  const amtW = wide ? 48 : 46;
  const nameW = inner - qtyW - priceW - amtW - 4;
  const colQty = MARGIN + nameW + 2;
  const colPrice = colQty + qtyW;
  const colAmt = width - MARGIN - amtW;

  doc.font("Helvetica-Bold").fontSize(7.5);
  doc.text("Item", MARGIN, y, { width: nameW, lineBreak: false });
  doc.text("Qty", colQty, y, { width: qtyW, align: "right", lineBreak: false });
  if (wide) doc.text("Price", colPrice, y, { width: priceW, align: "right", lineBreak: false });
  doc.text("Amount", colAmt, y, { width: amtW, align: "right", lineBreak: false });
  y += doc.currentLineHeight() + 2;
  rule();

  for (const item of model.items) {
    doc.font("Helvetica").fontSize(8);
    const nameHeight = doc.heightOfString(item.name, { width: nameW });
    doc.text(item.name, MARGIN, y, { width: nameW });
    doc.text(item.quantity, colQty, y, { width: qtyW, align: "right", lineBreak: false });
    if (wide) doc.text(num(item.unitPrice), colPrice, y, { width: priceW, align: "right", lineBreak: false });
    doc.text(num(item.amount), colAmt, y, { width: amtW, align: "right", lineBreak: false });
    y += nameHeight + 2;
    if (item.note) {
      doc.font("Helvetica-Oblique").fontSize(7).text(item.note, MARGIN + 4, y, { width: nameW });
      y = doc.y + 1;
    }
  }
  rule();

  row(`Items: ${model.itemCount}`, "");
  row("Subtotal", num(model.totals.subtotal));
  if (new D(model.totals.discount).greaterThan(0)) row("Discount", `-${num(model.totals.discount)}`);
  if (model.showTax) {
    row("SGST", num(model.totals.sgst));
    row("CGST", num(model.totals.cgst));
  }
  y += 2;
  row(`TOTAL (${model.currency})`, num(model.totals.total), true, 10);
  rule();

  for (const p of model.payments) row(`Paid by ${p.label}`, num(p.amount));
  if (model.received) row("Cash received", num(model.received));
  if (model.change) row("Change", num(model.change));
  if (model.notes) {
    y += 2;
    center(`Note: ${model.notes}`, 7.5);
  }
  if (model.footerText) {
    rule();
    center(model.footerText, 8);
  }
  return y + MARGIN;
}

/** Renders the receipt as a single narrow page, as long as it needs to be. */
export async function renderReceiptPdf(model: ReceiptModel): Promise<Buffer> {
  const width = WIDTH[model.paperSize];

  // Pass 1: measure on a very tall scratch page.
  const scratch = new PDFDocument({ size: [width, 20000], margin: 0, autoFirstPage: true });
  scratch.on("data", () => undefined);
  const height = Math.ceil(draw(scratch, model));
  scratch.end();

  // Pass 2: the real thing, cut to the measured height.
  const doc = new PDFDocument({
    size: [width, Math.max(height, 120)],
    margin: 0,
    info: { Title: `Receipt ${model.billNo}`, Author: model.businessName },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  draw(doc, model);
  doc.end();
  return finished;
}
