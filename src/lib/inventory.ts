import { D } from "@/lib/money";

export type StockStatus = "in" | "low" | "out";
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = { in: "In stock", low: "Low", out: "Out of stock" };

/** Out at zero or below; Low at or under the reorder level; otherwise In stock. */
export function stockStatus(quantity: string | number, reorderLevel: string | number): StockStatus {
  const qty = new D(quantity);
  if (qty.lessThanOrEqualTo(0)) return "out";
  return qty.lessThanOrEqualTo(new D(reorderLevel)) ? "low" : "in";
}

/** Value of stock on hand. Negative stock (oversold) is worth nothing, not less than nothing. */
export function stockValue(quantity: string | number, costPrice: string | number): string {
  const qty = new D(quantity);
  return (qty.isNegative() ? new D(0) : qty).times(costPrice).toDecimalPlaces(2).toFixed(2);
}

export const MANUAL_REASONS = ["purchase", "wastage", "damage", "correction", "return"] as const;
export type ManualReason = (typeof MANUAL_REASONS)[number];

export const REASON_LABELS: Record<string, string> = {
  purchase: "Purchase",
  wastage: "Wastage",
  damage: "Damage",
  correction: "Correction",
  return: "Return",
  sale: "Sale",
  void: "Void",
  refund: "Refund",
};

export type Direction = "add" | "remove";

/** Purchases bring stock in, wastage and damage take it out, corrections and returns can go either way. */
export function reasonAllowsDirection(reason: ManualReason, direction: Direction): boolean {
  if (reason === "purchase") return direction === "add";
  if (reason === "wastage" || reason === "damage") return direction === "remove";
  return true;
}

export function directionHint(reason: ManualReason): Direction | null {
  if (reason === "purchase") return "add";
  if (reason === "wastage" || reason === "damage") return "remove";
  return null;
}
