/**
 * Bill calculation helpers (pure, no I/O).
 *
 * Rules
 * -----
 * 1. Unit prices are tax-exclusive. SGST and CGST are percentages of the taxable amount.
 * 2. gross      = price x quantity
 * 3. A line discount is a flat amount, capped at the line's gross.
 * 4. The bill discount (percent or flat) applies to the sum of lines after line
 *    discounts. It is capped at that sum, rounded to 2 dp, and spread across the
 *    lines in proportion to their post-line-discount amounts using the
 *    largest-remainder method, so the shares add up exactly to the discount.
 * 5. taxable    = gross - line discount - bill-discount share
 * 6. sgst, cgst = round2(taxable x rate / 100) per line. Tax is zero when `ignoreTax`.
 * 7. line total = taxable + sgst + cgst
 * 8. Bill totals are the sums of the already-rounded line values, so every figure
 *    on the bill reconciles to the paisa:
 *      grandTotal = subtotal - totalDiscount + totalTax
 *
 * All inputs may be strings or numbers; all outputs are 2-decimal strings.
 */
import { D, round2, toDecimal, type Dec, type Numeric } from "@/lib/money";

export type DiscountType = "percent" | "flat";

export interface LineInput {
  price: Numeric;
  quantity: Numeric;
  sgst?: Numeric;
  cgst?: Numeric;
  /** Flat amount taken off this line before tax. */
  discount?: Numeric;
}

export interface BillDiscountInput {
  type: DiscountType;
  value: Numeric;
}

export interface CalculationOptions {
  ignoreTax?: boolean;
  billDiscount?: BillDiscountInput | null;
}

export interface LineResult {
  /** price x quantity */
  gross: string;
  /** Line discount actually applied (after capping). */
  lineDiscount: string;
  /** This line's share of the bill-level discount. */
  billDiscountShare: string;
  /** lineDiscount + billDiscountShare, as stored on the bill item. */
  discount: string;
  taxable: string;
  sgst: string;
  cgst: string;
  tax: string;
  /** taxable + tax */
  total: string;
}

export interface BillTotals {
  lines: LineResult[];
  /** Sum of gross before any discount. */
  subtotal: string;
  lineDiscounts: string;
  /** The bill-level discount amount after capping. */
  billDiscount: string;
  /** lineDiscounts + billDiscount. */
  totalDiscount: string;
  sgst: string;
  cgst: string;
  totalTax: string;
  grandTotal: string;
}

const ZERO = new D(0);

function nonNegative(value: Numeric): Dec {
  const d = toDecimal(value);
  return d.isNegative() ? ZERO : d;
}

/**
 * Unit price including tax, as shown on a receipt. Tax is rounded per component,
 * exactly like a bill line, so a single unit's price matches its line amount.
 */
export function unitPriceInclTax(
  price: Numeric,
  sgst: Numeric,
  cgst: Numeric,
  ignoreTax = false,
): string {
  const base = nonNegative(price);
  if (ignoreTax) return round2(base).toFixed(2);
  const sgstAmount = round2(base.times(nonNegative(sgst)).div(100));
  const cgstAmount = round2(base.times(nonNegative(cgst)).div(100));
  return round2(base).plus(sgstAmount).plus(cgstAmount).toFixed(2);
}

/** Resolves a bill-level discount to a capped, 2-dp amount. */
export function resolveBillDiscount(
  base: Numeric,
  discount: BillDiscountInput | null | undefined,
): Dec {
  const baseAmount = nonNegative(base);
  if (!discount || baseAmount.isZero()) return ZERO;
  const value = nonNegative(discount.value);
  const raw = discount.type === "percent" ? baseAmount.times(D.min(value, 100)).div(100) : value;
  return round2(D.min(raw, baseAmount));
}

/**
 * Splits `total` (a 2-dp amount) across `weights` so the parts sum exactly to
 * `total`. Uses the largest-remainder method on whole paise.
 */
export function allocateProportionally(total: Dec, weights: Dec[]): Dec[] {
  const weightSum = weights.reduce((acc, w) => acc.plus(w), ZERO);
  if (total.isZero() || weightSum.isZero()) return weights.map(() => ZERO);

  const paise = total.times(100).toDecimalPlaces(0);
  const exact = weights.map((w) => paise.times(w).div(weightSum));
  const floors = exact.map((e) => e.floor());
  let remainder = paise.minus(floors.reduce((acc, f) => acc.plus(f), ZERO)).toNumber();

  const byFraction = exact
    .map((e, index) => ({ index, fraction: e.minus(e.floor()) }))
    .sort((a, b) => b.fraction.comparedTo(a.fraction) || a.index - b.index);

  const parts = floors.map((f) => f);
  for (const { index } of byFraction) {
    if (remainder <= 0) break;
    parts[index] = (parts[index] ?? ZERO).plus(1);
    remainder -= 1;
  }
  return parts.map((p) => p.div(100));
}

export function calculateBill(lines: LineInput[], options: CalculationOptions = {}): BillTotals {
  const { ignoreTax = false, billDiscount = null } = options;

  // Steps 2-3: gross and capped line discounts.
  const stage1 = lines.map((line) => {
    const gross = round2(nonNegative(line.price).times(nonNegative(line.quantity)));
    const lineDiscount = round2(D.min(nonNegative(line.discount), gross));
    return { line, gross, lineDiscount, afterLine: gross.minus(lineDiscount) };
  });

  // Step 4: bill discount, spread over post-line-discount amounts.
  const afterLineSum = stage1.reduce((acc, s) => acc.plus(s.afterLine), ZERO);
  const billDiscountAmount = resolveBillDiscount(afterLineSum, billDiscount);
  const shares = allocateProportionally(
    billDiscountAmount,
    stage1.map((s) => s.afterLine),
  );

  // Steps 5-7: tax per line on the discounted taxable amount.
  const results: LineResult[] = stage1.map((s, i) => {
    const share = shares[i] ?? ZERO;
    const taxable = s.afterLine.minus(share);
    const sgst = ignoreTax ? ZERO : round2(taxable.times(nonNegative(s.line.sgst)).div(100));
    const cgst = ignoreTax ? ZERO : round2(taxable.times(nonNegative(s.line.cgst)).div(100));
    const tax = sgst.plus(cgst);
    return {
      gross: s.gross.toFixed(2),
      lineDiscount: s.lineDiscount.toFixed(2),
      billDiscountShare: share.toFixed(2),
      discount: s.lineDiscount.plus(share).toFixed(2),
      taxable: taxable.toFixed(2),
      sgst: sgst.toFixed(2),
      cgst: cgst.toFixed(2),
      tax: tax.toFixed(2),
      total: taxable.plus(tax).toFixed(2),
    };
  });

  // Step 8: totals are sums of rounded line values.
  const add = (pick: (r: LineResult) => string): Dec =>
    results.reduce((acc, r) => acc.plus(pick(r)), ZERO);

  const subtotal = add((r) => r.gross);
  const lineDiscounts = add((r) => r.lineDiscount);
  const totalDiscount = lineDiscounts.plus(billDiscountAmount);
  const sgst = add((r) => r.sgst);
  const cgst = add((r) => r.cgst);
  const totalTax = sgst.plus(cgst);
  const grandTotal = subtotal.minus(totalDiscount).plus(totalTax);

  return {
    lines: results,
    subtotal: subtotal.toFixed(2),
    lineDiscounts: lineDiscounts.toFixed(2),
    billDiscount: billDiscountAmount.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    sgst: sgst.toFixed(2),
    cgst: cgst.toFixed(2),
    totalTax: totalTax.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  };
}

/** Change to hand back; never negative. */
export function changeDue(total: Numeric, received: Numeric): string {
  const diff = toDecimal(received).minus(toDecimal(total));
  return round2(diff.isNegative() ? ZERO : diff).toFixed(2);
}

/** Amount still owed after payments; never negative. */
export function balanceDue(total: Numeric, paid: Numeric): string {
  const diff = toDecimal(total).minus(toDecimal(paid));
  return round2(diff.isNegative() ? ZERO : diff).toFixed(2);
}

/**
 * SGST and CGST of a line as saved on a bill, rebuilt from its snapshot with the same
 * rounding as `calculateBill`. `taxCharged` is false for bills saved while tax was ignored.
 */
export function savedLineTax(
  line: { price: Numeric; quantity: Numeric; discount: Numeric; sgst: Numeric; cgst: Numeric },
  taxCharged: boolean,
): { sgst: string; cgst: string; tax: string } {
  if (!taxCharged) return { sgst: "0.00", cgst: "0.00", tax: "0.00" };
  const taxable = round2(nonNegative(line.price).times(nonNegative(line.quantity))).minus(nonNegative(line.discount));
  const sgst = round2(taxable.times(nonNegative(line.sgst)).div(100));
  const cgst = round2(taxable.times(nonNegative(line.cgst)).div(100));
  return { sgst: sgst.toFixed(2), cgst: cgst.toFixed(2), tax: sgst.plus(cgst).toFixed(2) };
}
