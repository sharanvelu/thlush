/**
 * Turns a save request into a fully priced, validated plan, with no database access.
 *
 * Why it exists: the browser only says WHAT was ordered (item ids, quantities,
 * discounts, payments). Every price, tax rate and total comes from the catalog
 * passed in here, so a tampered or stale client can never change what is billed.
 * Persisting the plan (numbering, stock, rows) is `BillingService`'s job.
 */
import { HttpError } from "@/lib/errors";
import { D, parseMoney, parseQuantity, round2, type Dec } from "@/lib/money";
import type { BillSaveInput } from "@/lib/validation/bill";
import { calculateBill, type BillTotals } from "@/services/calculations";
import type { BillItemOptions, MenuAddon, MenuVariant } from "@/db/schema";
import type { DiscountKind, OrderType, PaymentMethod } from "@/types/bill";

/** The slice of a menu item the plan needs. */
export interface PlanItem {
  id: number;
  name: string;
  price: string;
  sgst: string;
  cgst: string;
  status: "active" | "disabled";
  categoryStatus: "active" | "disabled";
  /** Archived items cannot be sold. */
  deleted: boolean;
  unit: string;
  trackStock: boolean;
  stockQty: string;
  variants: MenuVariant[];
  addons: MenuAddon[];
}

export interface PlanSettings {
  ignoreTax: boolean;
  discountsEnabled: boolean;
  orderTypesEnabled: boolean;
  blockOutOfStock: boolean;
  /** When the Inventory feature is off, stock is neither deducted nor checked. Defaults to on. */
  inventoryEnabled?: boolean;
}

export interface PlannedLine {
  menuItemId: number;
  /** Snapshot name, including the chosen variant and add-ons. */
  name: string;
  /** Tax-exclusive unit price including variant and add-ons. */
  price: string;
  sgst: string;
  cgst: string;
  quantity: string;
  /** What is stored on the bill item: line + bill-discount share when completed, line only when held. */
  discount: string;
  total: string;
  options: BillItemOptions | null;
}

export interface PlannedPayment {
  method: PaymentMethod;
  amount: string;
  reference: string | null;
}

export interface BillPlan {
  status: "completed" | "held";
  lines: PlannedLine[];
  totals: BillTotals;
  payments: PlannedPayment[];
  /** Everything handed over, including cash that came back as change. */
  amountPaid: string;
  changeDue: string;
  discount: { type: DiscountKind; value: string } | null;
  orderType: OrderType | null;
  tableNo: string | null;
  notes: string | null;
  /** Quantity to take from stock, per tracked item. Empty for held bills. */
  stockUse: Map<number, string>;
}

const unavailable = (name: string) => HttpError.conflict(`"${name}" is no longer available. Remove it from the bill.`);

function resolveOptions(
  item: PlanItem,
  variantName: string | null,
  addonNames: string[],
): { unitPrice: Dec; label: string; options: BillItemOptions | null } {
  let unitPrice = new D(item.price);
  const labelParts: string[] = [];
  const options: BillItemOptions = {};

  if (item.variants.length > 0) {
    if (!variantName) throw HttpError.badRequest(`Choose a variant for "${item.name}".`);
    const variant = item.variants.find((v) => v.name === variantName);
    if (!variant) throw unavailable(`${item.name} (${variantName})`);
    unitPrice = unitPrice.plus(variant.priceDelta);
    labelParts.push(variant.name);
    options.variant = variant.name;
  } else if (variantName) {
    throw HttpError.badRequest(`"${item.name}" has no variants.`);
  }

  if (addonNames.length > 0) {
    if (new Set(addonNames).size !== addonNames.length) {
      throw HttpError.badRequest(`An add-on is repeated on "${item.name}".`);
    }
    options.addons = addonNames.map((addonName) => {
      const addon = item.addons.find((a) => a.name === addonName);
      if (!addon) throw unavailable(`${item.name} + ${addonName}`);
      unitPrice = unitPrice.plus(addon.price);
      return { name: addon.name, price: parseMoney(addon.price) };
    });
    labelParts.push(`+ ${addonNames.join(", ")}`);
  }

  if (unitPrice.isNegative()) throw HttpError.badRequest(`The price of "${item.name}" cannot be negative.`);
  const label = labelParts.length > 0 ? `${item.name} (${labelParts.join(" ")})` : item.name;
  return { unitPrice: round2(unitPrice), label, options: Object.keys(options).length > 0 ? options : null };
}

export function planBill(input: BillSaveInput, items: ReadonlyMap<number, PlanItem>, settings: PlanSettings): BillPlan {
  const completing = input.action === "complete";

  const anyDiscount =
    input.discount !== null || input.lines.some((line) => new D(line.discount).greaterThan(0));
  if (anyDiscount && !settings.discountsEnabled) throw HttpError.badRequest("Discounts are turned off.");

  // ---- Price every line from the catalog ---------------------------------
  const resolved = input.lines.map((line) => {
    const item = items.get(line.menuItemId);
    if (!item || item.deleted) throw unavailable(item?.name ?? "An item");
    if (item.status !== "active" || item.categoryStatus !== "active") throw unavailable(item.name);

    const quantity = new D(line.quantity);
    if (item.unit === "pcs" && !quantity.isInteger()) {
      throw HttpError.badRequest(`"${item.name}" is sold in whole pieces.`);
    }
    const { unitPrice, label, options } = resolveOptions(item, line.variant, line.addons);
    return { line, item, quantity, unitPrice, label, options };
  });

  const totals = calculateBill(
    resolved.map((r) => ({
      price: r.unitPrice,
      quantity: r.quantity,
      sgst: r.item.sgst,
      cgst: r.item.cgst,
      discount: r.line.discount,
    })),
    { ignoreTax: settings.ignoreTax, billDiscount: input.discount },
  );

  const lines: PlannedLine[] = resolved.map((r, index) => {
    const result = totals.lines[index];
    if (!result) throw new Error("Line total missing");
    return {
      menuItemId: r.item.id,
      name: r.label,
      price: parseMoney(r.unitPrice),
      sgst: r.item.sgst,
      cgst: r.item.cgst,
      quantity: parseQuantity(r.quantity),
      discount: completing ? result.discount : result.lineDiscount,
      total: result.total,
      options: r.options,
    };
  });

  // ---- Stock (only a completed sale takes stock) -------------------------
  const stockUse = new Map<number, string>();
  if (completing && settings.inventoryEnabled !== false) {
    const used = new Map<number, Dec>();
    for (const r of resolved) {
      if (!r.item.trackStock) continue;
      used.set(r.item.id, (used.get(r.item.id) ?? new D(0)).plus(r.quantity));
    }
    for (const [id, quantity] of used) {
      const item = items.get(id);
      if (!item) continue;
      if (settings.blockOutOfStock && quantity.greaterThan(item.stockQty)) {
        const left = new D(item.stockQty);
        throw HttpError.conflict(
          left.lessThanOrEqualTo(0)
            ? `"${item.name}" is out of stock.`
            : `Only ${left.toString()} ${item.unit} of "${item.name}" left.`,
        );
      }
      stockUse.set(id, parseQuantity(quantity));
    }
  }

  // ---- Payments -----------------------------------------------------------
  const total = new D(totals.grandTotal);
  let payments: PlannedPayment[] = [];
  let amountPaid = new D(0);
  let changeDue = new D(0);

  if (completing && total.greaterThan(0)) {
    if (input.payments.length === 0) throw HttpError.badRequest("Add a payment before saving the bill.");
    payments = input.payments.map((p) => ({ method: p.method, amount: parseMoney(p.amount), reference: p.reference }));
    if (payments.some((p) => new D(p.amount).lessThanOrEqualTo(0))) {
      throw HttpError.badRequest("Each payment must be more than zero.");
    }
    const applied = payments.reduce((acc, p) => acc.plus(p.amount), new D(0));
    if (!applied.equals(total)) {
      throw HttpError.badRequest(
        `Payments add up to ${applied.toFixed(2)} but the bill total is ${total.toFixed(2)}.`,
      );
    }

    const cashApplied = payments.filter((p) => p.method === "cash").reduce((acc, p) => acc.plus(p.amount), new D(0));
    const tendered = input.cashTendered === null ? cashApplied : new D(input.cashTendered);
    if (tendered.lessThan(cashApplied)) throw HttpError.badRequest("The cash received is less than the cash payment.");
    changeDue = tendered.minus(cashApplied);
    if (changeDue.greaterThan(0) && cashApplied.isZero()) {
      throw HttpError.badRequest("Change can only be given on a cash payment.");
    }
    amountPaid = total.plus(changeDue);
  } else if (completing && input.payments.some((p) => new D(p.amount).greaterThan(0))) {
    throw HttpError.badRequest("This bill has nothing to pay.");
  }

  return {
    status: completing ? "completed" : "held",
    lines,
    totals,
    payments,
    amountPaid: amountPaid.toFixed(2),
    changeDue: changeDue.toFixed(2),
    discount: input.discount ? { type: input.discount.type, value: parseMoney(input.discount.value) } : null,
    orderType: settings.orderTypesEnabled ? input.orderType : null,
    tableNo: settings.orderTypesEnabled && input.orderType === "dine_in" ? input.tableNo : null,
    notes: input.notes,
    stockUse,
  };
}
