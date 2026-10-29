import { describe, expect, it } from "vitest";
import { billSaveSchema } from "@/lib/validation/bill";
import { buildReceiptModel, mailtoUrl, receiptText, receiptTotals, whatsappUrl } from "@/lib/receipt";
import { planBill, type PlanItem } from "@/services/bill-plan";
import { defaultSettings } from "@/config";
import type { BillDetail } from "@/types/bill";

const item = (id: number, name: string, price: string, rate: string): PlanItem => ({
  id, name, price, sgst: rate, cgst: rate, status: "active", categoryStatus: "active", deleted: false,
  unit: "pcs", trackStock: false, stockQty: "0", variants: [], addons: [],
});
const catalog = new Map([
  [1, item(1, "Masala Dosa", "90.00", "2.5")],
  [2, item(2, "Packaged Water 1L", "20.00", "9")],
  [3, item(3, "Cake Slice", "33.33", "6")],
]);
const PLAN_SETTINGS = { ignoreTax: false, discountsEnabled: true, orderTypesEnabled: true, blockOutOfStock: false };

/** Saves a bill through the real planner and returns it the way `getBill` would. */
function billFrom(overrides: Record<string, unknown>, ignoreTax = false): BillDetail {
  const input = billSaveSchema.parse({
    action: "complete",
    clientRef: "receipt-test-1",
    lines: [{ menuItemId: 1, quantity: "3" }],
    payments: [],
    ...overrides,
  });
  const probe = planBill({ ...input, action: "hold", payments: [] }, catalog, { ...PLAN_SETTINGS, ignoreTax, discountsEnabled: true });
  const paid = planBill(
    { ...input, payments: [{ method: "cash", amount: probe.totals.grandTotal, reference: null }] },
    catalog,
    { ...PLAN_SETTINGS, ignoreTax },
  );
  return {
    id: 1, billNo: "INV-20261030-0001", status: "completed", createdAt: "2026-10-30T10:00:00.000Z", currency: "INR",
    subtotal: paid.totals.subtotal, totalDiscount: paid.totals.totalDiscount, totalTax: paid.totals.totalTax,
    totalAmount: paid.totals.grandTotal, discountType: paid.discount?.type ?? null, discountValue: paid.discount?.value ?? "0.00",
    amountPaid: paid.amountPaid, changeDue: paid.changeDue, orderType: null, tableNo: null, notes: null, voidReason: null,
    customer: { id: 1, name: "Asha", phone: "98450 10001", email: "asha@example.com" }, cashier: { id: "u", name: "Charu" },
    items: paid.lines.map((l, i) => ({ id: i + 1, menuItemId: l.menuItemId, name: l.name, price: l.price, sgst: l.sgst, cgst: l.cgst, quantity: l.quantity, discount: l.discount, total: l.total, options: l.options })),
    payments: paid.payments.map((p, i) => ({ id: i + 1, method: p.method, amount: p.amount, reference: p.reference })),
  };
}

describe("receiptTotals", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["a plain bill", {}],
    ["mixed tax rates", { lines: [{ menuItemId: 1, quantity: "2" }, { menuItemId: 2, quantity: "5" }, { menuItemId: 3, quantity: "3" }] }],
    ["line and bill discounts", { lines: [{ menuItemId: 1, quantity: "2", discount: "7" }, { menuItemId: 3, quantity: "3" }], discount: { type: "percent", value: "12.5" } }],
    ["a flat bill discount", { lines: [{ menuItemId: 2, quantity: "7" }, { menuItemId: 3, quantity: "1" }], discount: { type: "flat", value: "13" } }],
  ];

  it.each(cases)("rebuilds the saved tax and total for %s", (_name, overrides) => {
    const bill = billFrom(overrides);
    const totals = receiptTotals(bill);
    expect(totals.tax).toBe(bill.totalTax);
    expect(totals.total).toBe(bill.totalAmount);
    // The split must add back up to the stored tax, and the rows to the total.
    expect((Number(totals.sgst) + Number(totals.cgst)).toFixed(2)).toBe(bill.totalTax);
    expect(bill.items.reduce((acc, i) => acc + Number(i.total), 0).toFixed(2)).toBe(bill.totalAmount);
    expect((Number(totals.subtotal) - Number(totals.discount) + Number(totals.tax)).toFixed(2)).toBe(bill.totalAmount);
  });

  it("shows no tax on a bill saved while tax was ignored", () => {
    const bill = billFrom({}, true);
    expect(bill.totalTax).toBe("0.00");
    expect(receiptTotals(bill)).toMatchObject({ sgst: "0.00", cgst: "0.00", tax: "0.00" });
  });
});

describe("receipt model and sharing", () => {
  const bill = billFrom({ lines: [{ menuItemId: 1, quantity: "2", discount: "10" }] });
  const model = buildReceiptModel(bill, defaultSettings);

  it("shows the unit price including tax and notes line discounts", () => {
    expect(model.items[0]).toMatchObject({ quantity: "2", unitPrice: "94.50", note: "Discount -10.00" });
    expect(model.customerName).toBe("Asha");
  });

  it("falls back to the walk-in label with no customer", () => {
    const walkIn = buildReceiptModel({ ...bill, customer: null }, defaultSettings);
    expect(walkIn.customerName).toBe("Walk-in Customer");
  });

  it("writes plain text with the bill number, items and total", () => {
    // Intl separates the currency code with a non-breaking space.
    const text = receiptText(model).replaceAll("\u00a0", " ");
    expect(text).toContain("INV-20261030-0001");
    expect(text).toContain("Masala Dosa x 2");
    expect(text).toContain(`Total: INR ${Number(bill.totalAmount).toFixed(2)}`);
  });

  it("builds WhatsApp and email links", () => {
    expect(whatsappUrl(model)).toMatch(/^https:\/\/wa\.me\/919845010001\?text=/);
    expect(whatsappUrl({ ...model, customerPhone: null })).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(mailtoUrl(model, "asha@example.com")).toMatch(/^mailto:asha@example\.com\?subject=/);
  });
});
