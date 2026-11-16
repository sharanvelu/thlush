/**
 * Packaging charges (pure, no I/O), shared by the billing screen and the server so both add up the same.
 *
 * A menu item can carry a packaging charge. Whether it is added depends on the bill's order type and on the
 * Packaging settings. Charges become "Packaging" lines at the end of the bill, one per tax-rate pair, so the
 * tax split, receipts and reports need no special cases. A bill discount never reduces them.
 */
import { D, round2, toDecimal, type Dec, type Numeric } from "@/lib/money";
import type { OrderType } from "@/types/bill";
import type { PackagingSettings } from "@/types/settings";

export interface PackagingSource {
  /** Packaging charge per unit as set on the menu item. */
  charge: Numeric;
  quantity: Numeric;
  /** "pcs" counts units; weighed items (kg, l) count once per line. */
  unit: string;
  sgst: Numeric;
  cgst: Numeric;
}

export interface PackagingLine {
  /** The charge for this tax-rate pair. Quantity is always 1. */
  price: string;
  /** Rates the charge is taxed at; "0" when packaging is untaxed. */
  sgst: string;
  cgst: string;
}

export const PACKAGING_LINE_NAME = "Packaging";

/** True when this bill's order type gets packaging charges at all. */
export function packagingApplies(orderType: OrderType | null, settings: PackagingSettings): boolean {
  return orderType !== null && settings.orderTypes.includes(orderType);
}

export function packagingLines(
  sources: PackagingSource[],
  orderType: OrderType | null,
  settings: PackagingSettings,
): PackagingLine[] {
  if (!packagingApplies(orderType, settings)) return [];

  const charged = sources
    .map((s) => ({ ...s, charge: toDecimal(s.charge), quantity: toDecimal(s.quantity) }))
    .filter((s) => s.charge.greaterThan(0) && s.quantity.greaterThan(0));
  if (charged.length === 0) return [];

  const amounts: Array<{ amount: Dec; sgst: Numeric; cgst: Numeric }> = [];
  if (settings.mode === "per_bill") {
    // One charge for the bill: the highest, taxed at that item's rates.
    const top = charged.reduce((best, s) => (s.charge.greaterThan(best.charge) ? s : best));
    amounts.push({ amount: top.charge, sgst: top.sgst, cgst: top.cgst });
  } else {
    for (const s of charged) {
      const units = settings.mode === "per_unit" && s.unit === "pcs" ? s.quantity : new D(1);
      amounts.push({ amount: s.charge.times(units), sgst: s.sgst, cgst: s.cgst });
    }
  }

  // Merge by tax rate: the usual single rate gives one "Packaging" line.
  const byRate = new Map<string, PackagingLine & { sum: Dec }>();
  for (const { amount, sgst, cgst } of amounts) {
    const rates = settings.taxed ? { sgst: toDecimal(sgst).toString(), cgst: toDecimal(cgst).toString() } : { sgst: "0", cgst: "0" };
    const key = `${rates.sgst}|${rates.cgst}`;
    const entry = byRate.get(key) ?? { price: "0.00", ...rates, sum: new D(0) };
    entry.sum = entry.sum.plus(amount);
    byRate.set(key, entry);
  }
  return [...byRate.values()].map(({ sum, sgst, cgst }) => ({ price: round2(sum).toFixed(2), sgst, cgst }));
}
