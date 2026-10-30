import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/errors";
import { billSaveSchema, type BillSaveRequest } from "@/lib/validation/bill";
import { planBill, type PlanItem, type PlanSettings } from "@/services/bill-plan";

const dosa: PlanItem = {
  id: 1,
  name: "Masala Dosa",
  price: "100.00",
  sgst: "2.50",
  cgst: "2.50",
  status: "active",
  categoryStatus: "active",
  deleted: false,
  unit: "pcs",
  trackStock: false,
  stockQty: "0.000",
  variants: [],
  addons: [],
};

const coffee: PlanItem = {
  ...dosa,
  id: 2,
  name: "Cold Coffee",
  price: "90.00",
  variants: [
    { name: "Regular", priceDelta: "0" },
    { name: "Large", priceDelta: "30" },
  ],
  addons: [{ name: "Extra shot", price: "25" }],
};

const samosa: PlanItem = { ...dosa, id: 3, name: "Samosa", price: "40.00", trackStock: true, stockQty: "5.000" };
const rice: PlanItem = { ...dosa, id: 4, name: "Basmati", price: "200.00", unit: "kg" };

const catalog = (...items: PlanItem[]) => new Map(items.map((i) => [i.id, i]));

const settings: PlanSettings = { ignoreTax: false, discountsEnabled: true, orderTypesEnabled: true, blockOutOfStock: false };

const request = (overrides: Partial<BillSaveRequest> = {}) =>
  billSaveSchema.parse({
    action: "complete",
    clientRef: "test-ref-0001",
    lines: [{ menuItemId: 1, quantity: "2" }],
    payments: [{ method: "cash", amount: "210.00" }],
    ...overrides,
  });

function expectHttp(status: number, fn: () => unknown, message?: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
    if (message) expect((error as HttpError).message).toMatch(message);
    return;
  }
  expect.unreachable("expected the call to throw");
}

describe("planBill: pricing", () => {
  it("prices from the catalog and adds tax", () => {
    const plan = planBill(request(), catalog(dosa), settings);
    expect(plan.status).toBe("completed");
    expect(plan.totals.subtotal).toBe("200.00");
    expect(plan.totals.totalTax).toBe("10.00");
    expect(plan.totals.grandTotal).toBe("210.00");
    expect(plan.lines[0]).toMatchObject({ name: "Masala Dosa", price: "100.00", quantity: "2.000", total: "210.00" });
  });

  it("skips tax when the business ignores it", () => {
    const plan = planBill(
      request({ payments: [{ method: "cash", amount: "200.00" }] }),
      catalog(dosa),
      { ...settings, ignoreTax: true },
    );
    expect(plan.totals.totalTax).toBe("0.00");
    expect(plan.totals.grandTotal).toBe("200.00");
  });

  it("applies the chosen variant and add-ons and records them in the snapshot", () => {
    const plan = planBill(
      request({
        lines: [{ menuItemId: 2, quantity: "1", variant: "Large", addons: ["Extra shot"] }],
        payments: [{ method: "upi", amount: "152.26" }],
      }),
      catalog(coffee),
      settings,
    );
    // 90 + 30 + 25 = 145. Each 2.5% component is 3.625, rounded half-up to 3.63, so tax is 7.26.
    expect(plan.lines[0]?.price).toBe("145.00");
    expect(plan.lines[0]?.name).toBe("Cold Coffee (Large + Extra shot)");
    expect(plan.lines[0]?.options).toEqual({ variant: "Large", addons: [{ name: "Extra shot", price: "25.00" }] });
    expect(plan.totals.grandTotal).toBe("152.26");
  });

  it("requires a variant when the item has them, and rejects unknown ones", () => {
    expectHttp(400, () => planBill(request({ lines: [{ menuItemId: 2, quantity: "1" }] }), catalog(coffee), settings), /Choose a variant/);
    expectHttp(409, () => planBill(request({ lines: [{ menuItemId: 2, quantity: "1", variant: "Huge" }] }), catalog(coffee), settings));
    expectHttp(400, () => planBill(request({ lines: [{ menuItemId: 1, quantity: "1", variant: "Large" }] }), catalog(dosa), settings), /no variants/);
  });

  it("rejects unknown or repeated add-ons", () => {
    const line = { menuItemId: 2, quantity: "1", variant: "Regular" };
    expectHttp(409, () => planBill(request({ lines: [{ ...line, addons: ["Free pizza"] }] }), catalog(coffee), settings));
    expectHttp(400, () => planBill(request({ lines: [{ ...line, addons: ["Extra shot", "Extra shot"] }] }), catalog(coffee), settings), /repeated/);
  });

  it("sells whole pieces for pcs items but allows fractions for kg", () => {
    expectHttp(400, () => planBill(request({ lines: [{ menuItemId: 1, quantity: "1.5" }] }), catalog(dosa), settings), /whole pieces/);
    const plan = planBill(
      request({ lines: [{ menuItemId: 4, quantity: "0.5" }], payments: [{ method: "cash", amount: "105.00" }] }),
      catalog(rice),
      settings,
    );
    expect(plan.totals.grandTotal).toBe("105.00");
  });
});

describe("planBill: availability", () => {
  it.each([
    ["missing", undefined],
    ["archived", { ...dosa, deleted: true }],
    ["disabled", { ...dosa, status: "disabled" as const }],
    ["in a disabled category", { ...dosa, categoryStatus: "disabled" as const }],
  ])("rejects an item that is %s", (_label, item) => {
    expectHttp(409, () => planBill(request(), item ? catalog(item) : catalog(), settings), /no longer available/);
  });
});

describe("planBill: discounts", () => {
  it("stores line discount plus bill share on a completed bill", () => {
    const plan = planBill(
      request({
        lines: [{ menuItemId: 1, quantity: "2", discount: "20" }],
        discount: { type: "percent", value: "10" },
        payments: [{ method: "cash", amount: "170.10" }],
      }),
      catalog(dosa),
      settings,
    );
    // gross 200, line discount 20, bill 10% of 180 = 18, taxable 162, tax 8.10
    expect(plan.totals.totalDiscount).toBe("38.00");
    expect(plan.totals.grandTotal).toBe("170.10");
    expect(plan.lines[0]?.discount).toBe("38.00");
  });

  it("stores only the line discount on a held bill so it can be resumed faithfully", () => {
    const plan = planBill(
      request({
        action: "hold",
        lines: [{ menuItemId: 1, quantity: "2", discount: "20" }],
        discount: { type: "percent", value: "10" },
        payments: [],
      }),
      catalog(dosa),
      settings,
    );
    expect(plan.lines[0]?.discount).toBe("20.00");
    expect(plan.discount).toEqual({ type: "percent", value: "10.00" });
  });

  it("refuses discounts when the feature is off", () => {
    expectHttp(400, () => planBill(request({ discount: { type: "flat", value: "5" } }), catalog(dosa), { ...settings, discountsEnabled: false }), /turned off/);
    expectHttp(400, () => planBill(request({ lines: [{ menuItemId: 1, quantity: "1", discount: "5" }] }), catalog(dosa), { ...settings, discountsEnabled: false }), /turned off/);
  });
});

describe("planBill: payments", () => {
  it("accepts split payments that add up to the total", () => {
    const plan = planBill(
      request({
        payments: [
          { method: "cash", amount: "100.00" },
          { method: "upi", amount: "110.00", reference: "UPI123" },
        ],
      }),
      catalog(dosa),
      settings,
    );
    expect(plan.payments).toHaveLength(2);
    expect(plan.amountPaid).toBe("210.00");
    expect(plan.changeDue).toBe("0.00");
    expect(plan.payments[1]?.reference).toBe("UPI123");
  });

  it("rejects payments that do not add up", () => {
    expectHttp(400, () => planBill(request({ payments: [{ method: "cash", amount: "200.00" }] }), catalog(dosa), settings), /add up to 200\.00 but the bill total is 210\.00/);
    expectHttp(400, () => planBill(request({ payments: [{ method: "cash", amount: "300.00" }] }), catalog(dosa), settings));
    expectHttp(400, () => planBill(request({ payments: [] }), catalog(dosa), settings), /Add a payment/);
  });

  it("works out change from the cash handed over", () => {
    const plan = planBill(request({ cashTendered: "500.00" }), catalog(dosa), settings);
    expect(plan.changeDue).toBe("290.00");
    expect(plan.amountPaid).toBe("500.00");
    expect(plan.payments[0]?.amount).toBe("210.00");
  });

  it("only gives change against cash", () => {
    expectHttp(400, () => planBill(request({ payments: [{ method: "card", amount: "210.00" }], cashTendered: "300.00" }), catalog(dosa), settings), /cash payment/);
    expectHttp(400, () => planBill(request({ cashTendered: "100.00" }), catalog(dosa), settings), /less than the cash payment/);
  });

  it("needs no payment for a bill that totals zero, and refuses one", () => {
    const free = request({
      lines: [{ menuItemId: 1, quantity: "1" }],
      discount: { type: "percent", value: "100" },
      payments: [],
    });
    const plan = planBill(free, catalog(dosa), settings);
    expect(plan.totals.grandTotal).toBe("0.00");
    expect(plan.payments).toEqual([]);
    expectHttp(400, () => planBill({ ...free, payments: [{ method: "cash", amount: "5.00", reference: null }] }, catalog(dosa), settings), /nothing to pay/);
  });

  it("does not need payment to put a bill on hold", () => {
    const plan = planBill(request({ action: "hold", payments: [] }), catalog(dosa), settings);
    expect(plan.status).toBe("held");
    expect(plan.payments).toEqual([]);
    expect(plan.amountPaid).toBe("0.00");
  });
});

describe("planBill: stock", () => {
  const sale = (quantity: string, total: string) =>
    request({ lines: [{ menuItemId: 3, quantity }], payments: [{ method: "cash", amount: total }] });

  it("records stock use for tracked items", () => {
    const plan = planBill(sale("2", "84.00"), catalog(samosa), settings);
    expect(plan.stockUse.get(3)).toBe("2.000");
  });

  it("adds up the same item across several lines", () => {
    const plan = planBill(
      request({
        lines: [{ menuItemId: 3, quantity: "1" }, { menuItemId: 3, quantity: "2" }],
        payments: [{ method: "cash", amount: "126.00" }],
      }),
      catalog(samosa),
      settings,
    );
    expect(plan.stockUse.get(3)).toBe("3.000");
  });

  it("blocks overselling only when the setting is on", () => {
    expectHttp(409, () => planBill(sale("6", "252.00"), catalog(samosa), { ...settings, blockOutOfStock: true }), /Only 5 pcs of "Samosa" left/);
    expectHttp(409, () => planBill(sale("1", "42.00"), catalog({ ...samosa, stockQty: "0.000" }), { ...settings, blockOutOfStock: true }), /out of stock/);
    expect(planBill(sale("6", "252.00"), catalog(samosa), settings).stockUse.get(3)).toBe("6.000");
  });

  it("ignores stock entirely when the Inventory feature is off", () => {
    const off = { ...settings, blockOutOfStock: true, inventoryEnabled: false };
    const plan = planBill(sale("50", "2100.00"), catalog(samosa), off);
    expect(plan.stockUse.size).toBe(0);
  });

  it("does not touch stock for untracked items or held bills", () => {
    expect(planBill(request(), catalog(dosa), settings).stockUse.size).toBe(0);
    const held = planBill(request({ action: "hold", lines: [{ menuItemId: 3, quantity: "50" }], payments: [] }), catalog(samosa), { ...settings, blockOutOfStock: true });
    expect(held.stockUse.size).toBe(0);
  });
});

describe("planBill: order details", () => {
  it("keeps the table number only for dine-in", () => {
    expect(planBill(request({ orderType: "dine_in", tableNo: "T4" }), catalog(dosa), settings)).toMatchObject({ orderType: "dine_in", tableNo: "T4" });
    expect(planBill(request({ orderType: "takeaway", tableNo: "T4" }), catalog(dosa), settings)).toMatchObject({ orderType: "takeaway", tableNo: null });
  });

  it("ignores order types when the feature is off", () => {
    const plan = planBill(request({ orderType: "dine_in", tableNo: "T4" }), catalog(dosa), { ...settings, orderTypesEnabled: false });
    expect(plan.orderType).toBeNull();
    expect(plan.tableNo).toBeNull();
  });
});

describe("billSaveSchema", () => {
  it("requires at least one line and a client reference", () => {
    expect(billSaveSchema.safeParse({ action: "complete", clientRef: "abcdefgh", lines: [] }).success).toBe(false);
    expect(billSaveSchema.safeParse({ action: "complete", clientRef: "x", lines: [{ menuItemId: 1, quantity: "1" }] }).success).toBe(false);
  });

  it("rejects bad quantities", () => {
    for (const quantity of ["0", "-1", "abc", "1.2345", ""]) {
      expect(billSaveSchema.safeParse({ action: "hold", clientRef: "abcdefgh", lines: [{ menuItemId: 1, quantity }] }).success).toBe(false);
    }
  });

  it("accepts a new customer by name or an existing one by id", () => {
    const base = { action: "hold", clientRef: "abcdefgh", lines: [{ menuItemId: 1, quantity: "1" }] } as const;
    expect(billSaveSchema.safeParse({ ...base, customer: { id: 5 } }).success).toBe(true);
    expect(billSaveSchema.safeParse({ ...base, customer: { name: "Asha", phone: "9845" } }).success).toBe(true);
    expect(billSaveSchema.safeParse({ ...base, customer: { name: "  " } }).success).toBe(false);
  });
});
