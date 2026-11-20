/**
 * Turns a save request into a fully priced, validated plan, with no database access.
 *
 * Why it exists: the browser only says WHAT was ordered (item ids, quantities,
 * discounts, payments). Every price, tax rate and total comes from the catalog
 * passed in here, so a tampered or stale client can never change what is billed.
 * Persisting the plan (numbering, stock, rows) is `BillingService`'s job.
 */
import { type AddonChoice } from "@/lib/addons";
import { optionsSuffix } from "@/lib/line-label";
import { HttpError } from "@/lib/errors";
import { D, parseMoney, parseQuantity, round2, type Dec } from "@/lib/money";
import type { BillSaveInput } from "@/lib/validation/bill";
import { calculateBill, type BillTotals } from "@/services/calculations";
import { PACKAGING_LINE_NAME, packagingLines } from "@/services/packaging";
import type { BillItemOptions, MenuAddon, MenuVariant } from "@/db/schema";
import type { DiscountKind, OrderType, PaymentMethod } from "@/types/bill";
import type { PackagingSettings } from "@/types/settings";

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
  /** Packaging charge per unit (see the Packaging settings). */
  packagingCharge: string;
}

export interface PlanSettings {
  ignoreTax: boolean;
  discountsEnabled: boolean;
  orderTypesEnabled: boolean;
  blockOutOfStock: boolean;
  /** When the Inventory feature is off, stock is neither deducted nor checked. Defaults to on. */
  inventoryEnabled?: boolean;
  packaging: PackagingSettings;
}

export interface PlannedLine {
  /** Null on a packaging line, which is not a menu item. */
  menuItemId: number | null;
  /** A packaging charge the system added. Always after the ordered items. */
  isPackaging: boolean;
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
  addonChoices: AddonChoice[],
): { unitPrice: Dec; label: string; options: BillItemOptions | null } {
  let unitPrice = new D(item.price);
  const options: BillItemOptions = {};

  if (item.variants.length > 0) {
    if (!variantName) throw HttpError.badRequest(`Choose a variant for "${item.name}".`);
    const variant = item.variants.find((v) => v.name === variantName);
    if (!variant) throw unavailable(`${item.name} (${variantName})`);
    unitPrice = unitPrice.plus(variant.priceDelta);
    options.variant = variant.name;
  } else if (variantName) {
    throw HttpError.badRequest(`"${item.name}" has no variants.`);
  }

  if (addonChoices.length > 0) {
    // One entry per add-on: a repeat is a mistake, because "twice" is sent as a quantity.
    if (new Set(addonChoices.map((a) => a.name)).size !== addonChoices.length) {
      throw HttpError.badRequest(`An add-on is repeated on "${item.name}".`);
    }
    options.addons = addonChoices.map((choice) => {
      const addon = item.addons.find((a) => a.name === choice.name);
      if (!addon) throw unavailable(`${item.name} + ${choice.name}`);
      unitPrice = unitPrice.plus(new D(addon.price).times(choice.quantity));
      return {
        name: addon.name,
        price: parseMoney(addon.price),
        ...(choice.quantity > 1 ? { quantity: choice.quantity } : {}),
      };
    });
  }

  if (unitPrice.isNegative()) throw HttpError.badRequest(`The price of "${item.name}" cannot be negative.`);
  const saved = Object.keys(options).length > 0 ? options : null;
  return { unitPrice: round2(unitPrice), label: `${item.name}${optionsSuffix(saved)}`, options: saved };
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

  // Packaging charges follow the order type. They are lines of their own and the bill discount skips them.
  const orderType = settings.orderTypesEnabled ? input.orderType : null;
  const packaging = packagingLines(
    resolved.map((r) => ({
      charge: r.item.packagingCharge,
      quantity: r.quantity,
      unit: r.item.unit,
      sgst: r.item.sgst,
      cgst: r.item.cgst,
    })),
    orderType,
    settings.packaging,
  );

  const totals = calculateBill(
    [
      ...resolved.map((r) => ({
        price: r.unitPrice,
        quantity: r.quantity,
        sgst: r.item.sgst,
        cgst: r.item.cgst,
        discount: r.line.discount,
      })),
      ...packaging.map((p) => ({ price: p.price, quantity: 1, sgst: p.sgst, cgst: p.cgst, excludeFromBillDiscount: true })),
    ],
    { ignoreTax: settings.ignoreTax, billDiscount: input.discount },
  );

  const itemLines: PlannedLine[] = resolved.map((r, index) => {
    const result = totals.lines[index];
    if (!result) throw new Error("Line total missing");
    return {
      menuItemId: r.item.id,
      isPackaging: false,
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
  const packagingPlanned: PlannedLine[] = packaging.map((p, index) => {
    const result = totals.lines[resolved.length + index];
    if (!result) throw new Error("Packaging total missing");
    return {
      menuItemId: null,
      isPackaging: true,
      name: PACKAGING_LINE_NAME,
      price: parseMoney(p.price),
      sgst: p.sgst,
      cgst: p.cgst,
      quantity: parseQuantity(1),
      discount: "0.00",
      total: result.total,
      options: null,
    };
  });
  const lines = [...itemLines, ...packagingPlanned];

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
    orderType,
    tableNo: settings.orderTypesEnabled && input.orderType === "dine_in" ? input.tableNo : null,
    notes: input.notes,
    stockUse,
  };
}
