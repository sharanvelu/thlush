import { describe, expect, it } from "vitest";
import { billSaveSchema, type BillSaveRequest } from "@/lib/validation/bill";
import { planBill, type PlanItem, type PlanSettings } from "@/services/bill-plan";
import { calculateBill } from "@/services/calculations";
import { packagingLines, type PackagingSource } from "@/services/packaging";
import type { PackagingSettings } from "@/types/settings";

const settings = (patch: Partial<PackagingSettings> = {}): PackagingSettings => ({
  orderTypes: ["takeaway"],
  mode: "per_unit",
  taxed: true,
  billAmount: "0.00",
  ...patch,
});
const src = (charge: string, quantity: string, extra: Partial<PackagingSource> = {}): PackagingSource => ({
  charge,
  quantity,
  unit: "pcs",
  sgst: "2.5",
  cgst: "2.5",
  ...extra,
});

describe("packagingLines", () => {
  it("adds nothing for an order type that is not selected", () => {
    expect(packagingLines([src("10", "3")], "dine_in", settings())).toEqual([]);
    expect(packagingLines([src("10", "3")], null, settings())).toEqual([]);
    expect(packagingLines([src("10", "3")], "takeaway", settings({ orderTypes: [] }))).toEqual([]);
  });

  it("per unit: charge x quantity", () => {
    expect(packagingLines([src("10", "3")], "takeaway", settings())).toEqual([
      { price: "30.00", sgst: "2.5", cgst: "2.5" },
    ]);
  });

  it("per line: the charge once per item line, however many units", () => {
    const lines = packagingLines([src("10", "3"), src("5", "2")], "takeaway", settings({ mode: "per_line" }));
    expect(lines).toEqual([{ price: "15.00", sgst: "2.5", cgst: "2.5" }]);
  });

  it("once per bill: the highest charge, taxed at that item's rates", () => {
    const lines = packagingLines(
      [src("10", "3"), src("20", "1", { sgst: "9", cgst: "9" })],
      "takeaway",
      settings({ mode: "per_bill" }),
    );
    expect(lines).toEqual([{ price: "20.00", sgst: "9", cgst: "9" }]);
  });

  it("once per bill with a global amount: the global amount replaces the item charges", () => {
    const lines = packagingLines(
      [src("10", "3"), src("20", "1")],
      "takeaway",
      settings({ mode: "per_bill", billAmount: "15" }),
    );
    expect(lines).toEqual([{ price: "15.00", sgst: "2.5", cgst: "2.5" }]);
  });

  it("the global amount applies even when no item has a charge, taxed at the highest rates on the bill", () => {
    const lines = packagingLines(
      [src("0", "1"), src("0", "1", { sgst: "9", cgst: "9" })],
      "takeaway",
      settings({ mode: "per_bill", billAmount: "15" }),
    );
    expect(lines).toEqual([{ price: "15.00", sgst: "9", cgst: "9" }]);
  });

  it("the global amount is ignored in the other modes, and only counts for the chosen order types", () => {
    expect(
      packagingLines([src("10", "3")], "takeaway", settings({ mode: "per_unit", billAmount: "15" }))[0]?.price,
    ).toBe("30.00");
    expect(packagingLines([src("10", "3")], "dine_in", settings({ mode: "per_bill", billAmount: "15" }))).toEqual([]);
  });

  it("falls back to the highest item charge when the global amount is 0", () => {
    expect(
      packagingLines(
        [src("10", "1"), src("20", "1")],
        "takeaway",
        settings({ mode: "per_bill", billAmount: "0.00" }),
      )[0]?.price,
    ).toBe("20.00");
  });

  it("counts a weighed item once per line even per unit", () => {
    expect(packagingLines([src("10", "1.5", { unit: "kg" })], "takeaway", settings())[0]?.price).toBe("10.00");
  });

  it("skips items with no charge, and merges equal tax rates into one line", () => {
    const lines = packagingLines([src("0", "2"), src("4", "1"), src("6", "1")], "takeaway", settings());
    expect(lines).toEqual([{ price: "10.00", sgst: "2.5", cgst: "2.5" }]);
  });

  it("keeps different tax rates on separate lines", () => {
    const lines = packagingLines([src("10", "1"), src("10", "1", { sgst: "9", cgst: "9" })], "takeaway", settings());
    expect(lines).toHaveLength(2);
  });

  it("untaxed packaging carries no tax rates", () => {
    expect(packagingLines([src("10", "1")], "takeaway", settings({ taxed: false }))).toEqual([
      { price: "10.00", sgst: "0", cgst: "0" },
    ]);
  });
});

describe("bill discount and packaging", () => {
  it("never reduces a line marked to stay out of the discount", () => {
    const totals = calculateBill(
      [
        { price: "100", quantity: 1, sgst: 0, cgst: 0 },
        { price: "20", quantity: 1, sgst: 0, cgst: 0, excludeFromBillDiscount: true },
      ],
      { billDiscount: { type: "percent", value: "50" } },
    );
    expect(totals.billDiscount).toBe("50.00"); // 50% of 100, not of 120.
    expect(totals.lines[1]?.total).toBe("20.00");
    expect(totals.grandTotal).toBe("70.00");
  });
});

const item = (id: number, name: string, price: string, packagingCharge: string): PlanItem => ({
  id,
  name,
  price,
  sgst: "2.50",
  cgst: "2.50",
  status: "active",
  categoryStatus: "active",
  deleted: false,
  unit: "pcs",
  trackStock: false,
  stockQty: "0",
  variants: [],
  addons: [],
  packagingCharge,
});
const planSettings = (packaging: PackagingSettings): PlanSettings => ({
  ignoreTax: false,
  discountsEnabled: true,
  orderTypesEnabled: true,
  blockOutOfStock: false,
  packaging,
});
const catalog = new Map([
  [1, item(1, "Biryani", "200.00", "10.00")],
  [2, item(2, "Water", "20.00", "0.00")],
]);
const request = (overrides: Partial<BillSaveRequest> = {}) =>
  billSaveSchema.parse({
    action: "hold",
    clientRef: "packaging-test-1",
    lines: [
      { menuItemId: 1, quantity: "2" },
      { menuItemId: 2, quantity: "1" },
    ],
    ...overrides,
  });

describe("planBill with packaging", () => {
  it("adds a Packaging line after the items for takeaway, taxed, and outside the discount", () => {
    const plan = planBill(
      request({ orderType: "takeaway", discount: { type: "percent", value: "10" } }),
      catalog,
      planSettings(settings()),
    );
    const last = plan.lines.at(-1);
    expect(plan.lines).toHaveLength(3);
    expect(last).toMatchObject({
      name: "Packaging",
      isPackaging: true,
      menuItemId: null,
      price: "20.00",
      quantity: "1.000",
      discount: "0.00",
    });
    // Items come to 2 x 200 + 20 = 420, so 10% is 42. The 20 of packaging is not discounted, then taxed at 5%.
    expect(plan.totals.billDiscount).toBe("42.00");
    expect(last?.total).toBe("21.00"); // 20 + 5% tax
  });

  it("adds nothing for dine-in", () => {
    const plan = planBill(request({ orderType: "dine_in" }), catalog, planSettings(settings()));
    expect(plan.lines.some((l) => l.isPackaging)).toBe(false);
  });

  it("adds nothing when order types are switched off", () => {
    const plan = planBill(request({ orderType: "takeaway" }), catalog, {
      ...planSettings(settings()),
      orderTypesEnabled: false,
    });
    expect(plan.lines.some((l) => l.isPackaging)).toBe(false);
  });

  it("charges no tax on packaging when the setting is off", () => {
    const plan = planBill(request({ orderType: "takeaway" }), catalog, planSettings(settings({ taxed: false })));
    expect(plan.lines.at(-1)?.total).toBe("20.00");
  });
});
