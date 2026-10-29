/**
 * Billing screen logic with no React in it: the cart reducer, live totals and
 * payment resolution. Kept pure so it can be tested directly.
 *
 * The server recomputes every price from the catalog when a bill is saved, so
 * these numbers are for display and for deciding whether Save may be pressed.
 */
import type { MenuAddon, MenuVariant } from "@/db/schema";
import { D, parseMoney, parseQuantity, toDecimal, type Dec } from "@/lib/money";
import { calculateBill, type BillDiscountInput, type BillTotals } from "@/services/calculations";
import type { PaymentMethod } from "@/types/bill";

/** A menu item as the billing screen sees it. */
export interface PosItem {
  id: number;
  name: string;
  price: string;
  sgst: string;
  cgst: string;
  categoryId: number;
  categoryName: string;
  sku: string | null;
  isVeg: boolean | null;
  imageSrc: string | null;
  variants: MenuVariant[];
  addons: MenuAddon[];
  unit: string;
  trackStock: boolean;
  stockQty: string;
  status: "active" | "disabled";
}

export interface CartLine {
  /** Same item with the same variant and add-ons is one line. */
  key: string;
  item: PosItem;
  variant: string | null;
  addons: string[];
  quantity: string;
  /** Flat amount off this line, as typed. Empty means none. */
  discount: string;
}

export function lineKey(itemId: number, variant: string | null, addons: string[]): string {
  return `${itemId}|${variant ?? ""}|${[...addons].sort().join(",")}`;
}

/** Unit price with the chosen variant and add-ons, before tax. */
export function unitPriceOf(item: PosItem, variant: string | null, addons: string[]): Dec {
  let price = new D(item.price);
  if (variant) price = price.plus(item.variants.find((v) => v.name === variant)?.priceDelta ?? 0);
  for (const name of addons) price = price.plus(item.addons.find((a) => a.name === name)?.price ?? 0);
  return price;
}

/** Pieces move by 1; weighed items (kg, l) by half. */
export const stepFor = (item: PosItem): Dec => new D(item.unit === "pcs" ? 1 : 0.5);

/** Quantity as stored in the cart: whole numbers for pieces, up to 3 decimals otherwise. */
function normalizeQuantity(item: PosItem, value: Dec): Dec {
  return item.unit === "pcs" ? value.toDecimalPlaces(0, D.ROUND_HALF_UP) : value.toDecimalPlaces(3, D.ROUND_HALF_UP);
}

export type CartAction =
  | { type: "add"; item: PosItem; variant?: string | null; addons?: string[] }
  | { type: "step"; key: string; direction: 1 | -1 }
  | { type: "setQuantity"; key: string; quantity: string }
  | { type: "setDiscount"; key: string; discount: string }
  | { type: "remove"; key: string }
  | { type: "replace"; lines: CartLine[] }
  | { type: "clear" };

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const variant = action.variant ?? null;
      const addons = action.addons ?? [];
      const key = lineKey(action.item.id, variant, addons);
      const existing = state.find((l) => l.key === key);
      if (existing) {
        return state.map((l) =>
          l.key === key ? { ...l, quantity: new D(l.quantity).plus(stepFor(l.item)).toString() } : l,
        );
      }
      return [
        ...state,
        { key, item: action.item, variant, addons, quantity: action.item.unit === "pcs" ? "1" : "1", discount: "" },
      ];
    }
    case "step":
      return state.flatMap((l) => {
        if (l.key !== action.key) return [l];
        const next = new D(l.quantity).plus(stepFor(l.item).times(action.direction));
        return next.lessThanOrEqualTo(0) ? [] : [{ ...l, quantity: next.toString() }];
      });
    case "setQuantity":
      return state.flatMap((l) => {
        if (l.key !== action.key) return [l];
        const typed = toDecimal(action.quantity);
        if (typed.lessThanOrEqualTo(0)) return []; // Zero (or junk) removes the line.
        const next = normalizeQuantity(l.item, typed);
        return next.lessThanOrEqualTo(0) ? [] : [{ ...l, quantity: next.toString() }];
      });
    case "setDiscount":
      return state.map((l) => (l.key === action.key ? { ...l, discount: action.discount } : l));
    case "remove":
      return state.filter((l) => l.key !== action.key);
    case "replace":
      return action.lines;
    case "clear":
      return [];
  }
}

export interface CartTotalsOptions {
  ignoreTax: boolean;
  billDiscount: BillDiscountInput | null;
}

export function cartTotals(lines: CartLine[], options: CartTotalsOptions): BillTotals {
  return calculateBill(
    lines.map((l) => ({
      price: unitPriceOf(l.item, l.variant, l.addons),
      quantity: l.quantity,
      sgst: l.item.sgst,
      cgst: l.item.cgst,
      discount: l.discount || "0",
    })),
    { ignoreTax: options.ignoreTax, billDiscount: options.billDiscount },
  );
}

/** Units of a tracked item already in the cart (all of its lines). */
export function quantityInCart(lines: CartLine[], itemId: number): Dec {
  return lines.filter((l) => l.item.id === itemId).reduce((acc, l) => acc.plus(l.quantity), new D(0));
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface PaymentRowState {
  id: string;
  method: PaymentMethod;
  /** What the customer hands over by this method. */
  amount: string;
  reference: string;
}

export interface PaymentState {
  split: boolean;
  method: PaymentMethod;
  /** Cash handed over (single payment). Empty means the exact amount. */
  received: string;
  reference: string;
  rows: PaymentRowState[];
}

export interface PaymentResult {
  /** Whether the bill can be saved with this payment. */
  valid: boolean;
  /** Amounts applied to the bill, summing exactly to the total. */
  payments: Array<{ method: PaymentMethod; amount: string; reference: string | null }>;
  /** Cash handed over when change is due, else null. */
  cashTendered: string | null;
  change: string;
  /** Still to collect. "0.00" when fully covered. */
  remaining: string;
  message: string | null;
}

const ref = (value: string) => value.trim() || null;

export function resolvePayment(state: PaymentState, totalAmount: string): PaymentResult {
  const total = new D(totalAmount);
  const done = (extra: Partial<PaymentResult>): PaymentResult => ({
    valid: true,
    payments: [],
    cashTendered: null,
    change: "0.00",
    remaining: "0.00",
    message: null,
    ...extra,
  });

  if (total.lessThanOrEqualTo(0)) return done({});

  if (!state.split) {
    if (state.method !== "cash") {
      return done({ payments: [{ method: state.method, amount: total.toFixed(2), reference: ref(state.reference) }] });
    }
    const received = state.received.trim() === "" ? total : toDecimal(state.received);
    if (received.lessThan(total)) {
      return done({
        valid: false,
        remaining: total.minus(received).toFixed(2),
        message: "The cash received is less than the total.",
      });
    }
    const change = received.minus(total);
    return done({
      payments: [{ method: "cash", amount: total.toFixed(2), reference: null }],
      cashTendered: change.greaterThan(0) ? received.toFixed(2) : null,
      change: change.toFixed(2),
    });
  }

  const rows = state.rows
    .map((r) => ({ ...r, value: toDecimal(r.amount) }))
    .filter((r) => r.value.greaterThan(0));
  const handed = rows.reduce((acc, r) => acc.plus(r.value), new D(0));
  if (handed.lessThan(total)) {
    return done({ valid: false, remaining: total.minus(handed).toFixed(2), message: `${total.minus(handed).toFixed(2)} still to collect.` });
  }

  const change = handed.minus(total);
  const cashHanded = rows.filter((r) => r.method === "cash").reduce((acc, r) => acc.plus(r.value), new D(0));
  if (change.greaterThan(cashHanded)) {
    return done({ valid: false, message: "Only cash can be given back as change." });
  }

  // Take the change out of the cash rows, last first, so the applied amounts add up to the total.
  let toTake = change;
  const applied = [...rows].reverse().map((r) => {
    if (r.method !== "cash" || toTake.isZero()) return { ...r, applied: r.value };
    const take = D.min(toTake, r.value);
    toTake = toTake.minus(take);
    return { ...r, applied: r.value.minus(take) };
  });
  return done({
    payments: applied
      .reverse()
      .filter((r) => r.applied.greaterThan(0))
      .map((r) => ({ method: r.method, amount: r.applied.toFixed(2), reference: ref(r.reference) })),
    cashTendered: change.greaterThan(0) ? cashHanded.toFixed(2) : null,
    change: change.toFixed(2),
  });
}

/** "Exact" plus the next few round amounts above the total, for one-tap cash entry. */
export function quickCashAmounts(totalAmount: string): string[] {
  const total = new D(totalAmount);
  if (total.lessThanOrEqualTo(0)) return [];
  const amounts = new Set<string>([total.toFixed(2)]);
  for (const step of [10, 50, 100, 500, 2000]) {
    const rounded = total.div(step).ceil().times(step);
    if (rounded.greaterThan(total)) amounts.add(rounded.toFixed(2));
    if (amounts.size >= 5) break;
  }
  return [...amounts].map((a) => parseMoney(a));
}

export { parseQuantity };
